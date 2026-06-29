"""
ANÁLISE DE LACUNAS DE SINCRONIZAÇÃO
As datas não são o problema. A diferença vem de vendas que estão no ERP mas não no banco.
Vamos analisar a sequência de IDs para detectar gaps, e verificar se há IDs faltando.
ERP: Abril=608819.01  Maio=1776423.83  Junho=1488803.85
Dash: Abril=601272.45  Maio=1754226.81  Junho=1488291.85
Dif:  Abril=-7546.56  Maio=-22197.02  Junho=-512.00
"""
import paramiko

HOST = '2.24.82.19'
USER = 'root'
PASS = 'Col@13894645'
CONTAINER = 'vasjsucz4yxcb7m4rtqindd2'
T = "'2395efd5-6476-4f3c-a7b8-f31d5567b42f'"
FILTER = "AND UPPER(TRIM(status)) IN ('FATURADO','FINALIZADO','PROCESSADO') AND (UPPER(TRIM(COALESCE(especie,''))) != 'GARANTIA' OR (COALESCE(valor_total,0)-COALESCE(valor_desconto,0))>=0)"

def run(client, sql, desc=""):
    cmd = f"docker exec {CONTAINER} psql -U coliseu_admin -d coliseu_dashboard -c \"{sql}\""
    _, stdout, _ = client.exec_command(cmd)
    out = stdout.read().decode('utf-8')
    if desc:
        print(f"\n{'='*60}\n=== {desc} ===\n{'='*60}")
    print(out)
    return out

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PASS, timeout=20)

# ========================================================
# 1. RANGE DE IDs POR MÊS - ver faixas de id_firebird
# ========================================================
run(client, f"""
SELECT 
  TO_CHAR(data_venda, 'YYYY-MM') as mes,
  MIN(id_firebird) as id_min,
  MAX(id_firebird) as id_max,
  COUNT(*) as qtd_ids,
  MAX(id_firebird) - MIN(id_firebird) + 1 as range_esperado,
  (MAX(id_firebird) - MIN(id_firebird) + 1) - COUNT(*) as gaps_possiveis
FROM dash_vendas
WHERE tenant_id = {T}
  AND data_venda >= '2026-04-01'
  AND data_venda <= '2026-06-30'
GROUP BY mes
ORDER BY mes;
""", "1. RANGE DE IDs POR MÊS (detectar gaps de sincronização)")

# ========================================================
# 2. TOTAL DE TODAS AS VENDAS DO MÊS (SEM filtro de status)
#    para ver o que temos no banco antes de qualquer filtro
# ========================================================
run(client, f"""
SELECT 
  TO_CHAR(data_venda, 'YYYY-MM') as mes,
  UPPER(TRIM(status)) as status_,
  COUNT(*) as qtd,
  SUM(valor_total - COALESCE(valor_desconto, 0)) as total
FROM dash_vendas
WHERE tenant_id = {T}
  AND data_venda >= '2026-04-01'
  AND data_venda <= '2026-06-30'
GROUP BY mes, UPPER(TRIM(status))
ORDER BY mes, qtd DESC;
""", "2. TODOS OS STATUS PRESENTES NO BANCO POR MÊS (sem filtro)")

# ========================================================
# 3. ANÁLISE DO CAMPO DESCONTO - O ERP pode calcular diferente
#    Verificar se há vendas onde valor_desconto não foi sincronizado
# ========================================================
run(client, f"""
SELECT 
  TO_CHAR(data_venda, 'YYYY-MM') as mes,
  COUNT(CASE WHEN valor_desconto IS NULL THEN 1 END) as sem_desconto,
  COUNT(CASE WHEN valor_desconto = 0 THEN 1 END) as desconto_zero,
  COUNT(CASE WHEN valor_desconto > 0 THEN 1 END) as com_desconto,
  SUM(COALESCE(valor_desconto, 0)) as total_descontos
FROM dash_vendas
WHERE tenant_id = {T}
  AND data_venda >= '2026-04-01'
  AND data_venda <= '2026-06-30'
  {FILTER}
GROUP BY mes
ORDER BY mes;
""", "3. ANÁLISE DO CAMPO valor_desconto")

# ========================================================
# 4. VERIFICAR VENDAS COM valor_total NULL ou valor_total = 0
#    que poderiam estar sendo somadas incorretamente
# ========================================================
run(client, f"""
SELECT 
  TO_CHAR(data_venda, 'YYYY-MM') as mes,
  COUNT(CASE WHEN valor_total IS NULL THEN 1 END) as sem_valor,
  COUNT(CASE WHEN valor_total = 0 THEN 1 END) as valor_zero,
  COUNT(CASE WHEN valor_total > 0 THEN 1 END) as valor_positivo,
  COUNT(CASE WHEN valor_total < 0 THEN 1 END) as valor_negativo
FROM dash_vendas
WHERE tenant_id = {T}
  AND data_venda >= '2026-04-01'
  AND data_venda <= '2026-06-30'
  {FILTER}
GROUP BY mes
ORDER BY mes;
""", "4. ANÁLISE valor_total NULL/ZERO/POS/NEG por mês")

# ========================================================
# 5. OLHAR O QUE O ERP MOSTRA vs O QUE TEMOS
#    Na imagem do ERP, a primeira venda visível é id=417 de 20/04
#    Verificar se o banco tem essa faixa de IDs de abril
# ========================================================
run(client, f"""
SELECT id_firebird, TO_CHAR(data_venda,'DD/MM/YYYY HH24:MI') as data, 
  especie, status, valor_total, valor_desconto,
  (valor_total - COALESCE(valor_desconto,0)) as liquido
FROM dash_vendas
WHERE tenant_id = {T}
  AND data_venda >= '2026-04-20'
  AND data_venda <= '2026-04-20 23:59:59'
  AND id_firebird BETWEEN 400 AND 500
ORDER BY id_firebird
LIMIT 30;
""", "5. IDs 400-500 DO DIA 20/04 (primeiros visíveis no ERP)")

# ========================================================
# 6. CHECAR SE HÁ VENDAS COM status FATURADO MAS valor < 0 que estão DENTRO do filtro
#    (ou seja, vendas negativas que não são GARANTIA nem DEVOLUCAO DE CLIENTE)
# ========================================================
run(client, f"""
SELECT 
  TO_CHAR(data_venda, 'YYYY-MM') as mes,
  UPPER(TRIM(COALESCE(especie, 'NULL'))) as especie_,
  COUNT(*) as qtd,
  SUM(valor_total - COALESCE(valor_desconto, 0)) as total
FROM dash_vendas
WHERE tenant_id = {T}
  AND data_venda >= '2026-04-01'
  AND data_venda <= '2026-06-30'
  AND (valor_total - COALESCE(valor_desconto, 0)) < 0
  {FILTER}
GROUP BY mes, UPPER(TRIM(COALESCE(especie, 'NULL')))
ORDER BY mes, total ASC;
""", "6. VENDAS NEGATIVAS DENTRO DO FILTRO (não garantia, não devolucao_cliente)")

client.close()
print("\n=== ANÁLISE DE GAPS CONCLUÍDA ===")

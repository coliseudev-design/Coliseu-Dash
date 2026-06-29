"""
AUDITORIA DEFINITIVA DE FATURAMENTO
Tenant: 2395efd5-6476-4f3c-a7b8-f31d5567b42f

Este script executa 4 análises precisas para identificar a raiz da divergência:
1. Totais mensais por método de cálculo (bruto-desconto vs totalBruto-totalDescontos-totalDev)
2. Listagem diária completa Abril, Maio e Junho 2026
3. Vendas com status diferente de FATURADO/FINALIZADO/PROCESSADO (que podem estar sendo incluídas erroneamente)
4. Devoluções por mês para conferência
"""
import paramiko, json

HOST = '2.24.82.19'
USER = 'root'
PASS = 'Col@13894645'
CONTAINER = 'vasjsucz4yxcb7m4rtqindd2'
TENANT = '2395efd5-6476-4f3c-a7b8-f31d5567b42f'

def run(client, sql, desc=""):
    cmd = f"docker exec {CONTAINER} psql -U coliseu_admin -d coliseu_dashboard -c \"{sql}\""
    _, stdout, stderr = client.exec_command(cmd)
    out = stdout.read().decode('utf-8')
    err = stderr.read().decode('utf-8')
    if desc:
        print(f"\n{'='*60}")
        print(f"=== {desc} ===")
        print('='*60)
    print(out)
    if err and 'WARN' not in err:
        print("STDERR:", err)
    return out

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PASS, timeout=20)

TENANT_STR = f"'{TENANT}'"

# ========================
# 1. TOTAIS MENSAIS - Método A: valor_total - valor_desconto (método bi.js)
# ========================
run(client, f"""
SELECT 
  TO_CHAR(COALESCE(data_vencimento, data_venda), 'YYYY-MM') as mes,
  COUNT(*) as qtd_vendas,
  SUM(valor_total - COALESCE(valor_desconto, 0)) as metodo_A_bi_js,
  SUM(valor_total) as total_bruto,
  SUM(COALESCE(valor_desconto, 0)) as total_descontos,
  SUM(valor_total) - SUM(COALESCE(valor_desconto, 0)) as metodo_B_estatisticas_sem_dev
FROM dash_vendas
WHERE tenant_id = {TENANT_STR}
  AND COALESCE(data_vencimento, data_venda) >= '2026-04-01'
  AND COALESCE(data_vencimento, data_venda) <= '2026-06-30'
  AND UPPER(TRIM(status)) IN ('FATURADO', 'FINALIZADO', 'PROCESSADO')
  AND (UPPER(TRIM(COALESCE(especie, ''))) != 'GARANTIA' OR (COALESCE(valor_total, 0) - COALESCE(valor_desconto, 0)) >= 0)
GROUP BY mes
ORDER BY mes;
""", "1. TOTAIS MENSAIS - Comparação de métodos (sem devoluções)")

# ========================
# 2. DEVOLUÇÕES POR MÊS
# ========================
run(client, f"""
SELECT 
  TO_CHAR(data_devolucao, 'YYYY-MM') as mes,
  COUNT(*) as qtd_devolucoes,
  SUM(valor) as total_devolucoes
FROM dash_devolucoes
WHERE tenant_id = {TENANT_STR}
  AND data_devolucao >= '2026-04-01'
  AND data_devolucao <= '2026-06-30'
GROUP BY mes
ORDER BY mes;
""", "2. DEVOLUÇÕES POR MÊS (Abril-Junho 2026)")

# ========================
# 3. FATURAMENTO LÍQUIDO FINAL POR MÊS (bi.js + devolucoes)
# ========================
run(client, f"""
WITH vendas AS (
  SELECT 
    TO_CHAR(COALESCE(data_vencimento, data_venda), 'YYYY-MM') as mes,
    SUM(valor_total - COALESCE(valor_desconto, 0)) as fat_bruto_liquido
  FROM dash_vendas
  WHERE tenant_id = {TENANT_STR}
    AND COALESCE(data_vencimento, data_venda) >= '2026-04-01'
    AND COALESCE(data_vencimento, data_venda) <= '2026-06-30'
    AND UPPER(TRIM(status)) IN ('FATURADO', 'FINALIZADO', 'PROCESSADO')
    AND (UPPER(TRIM(COALESCE(especie, ''))) != 'GARANTIA' OR (COALESCE(valor_total, 0) - COALESCE(valor_desconto, 0)) >= 0)
  GROUP BY mes
),
devs AS (
  SELECT 
    TO_CHAR(data_devolucao, 'YYYY-MM') as mes,
    SUM(valor) as total_dev
  FROM dash_devolucoes
  WHERE tenant_id = {TENANT_STR}
    AND data_devolucao >= '2026-04-01'
    AND data_devolucao <= '2026-06-30'
  GROUP BY mes
)
SELECT 
  v.mes,
  v.fat_bruto_liquido as faturamento_dashboard,
  COALESCE(d.total_dev, 0) as devolucoes,
  v.fat_bruto_liquido - COALESCE(d.total_dev, 0) as faturamento_liquido_final
FROM vendas v
LEFT JOIN devs d ON d.mes = v.mes
ORDER BY v.mes;
""", "3. FATURAMENTO LÍQUIDO FINAL POR MÊS (vendas - devoluções)")

# ========================
# 4. ANÁLISE DIA A DIA - JUNHO 2026
# ========================
run(client, f"""
SELECT 
  TO_CHAR(COALESCE(data_vencimento, data_venda), 'YYYY-MM-DD') as dia,
  COUNT(*) as qtd,
  SUM(valor_total - COALESCE(valor_desconto, 0)) as total_liquido
FROM dash_vendas
WHERE tenant_id = {TENANT_STR}
  AND COALESCE(data_vencimento, data_venda) >= '2026-06-01'
  AND COALESCE(data_vencimento, data_venda) <= '2026-06-30'
  AND UPPER(TRIM(status)) IN ('FATURADO', 'FINALIZADO', 'PROCESSADO')
  AND (UPPER(TRIM(COALESCE(especie, ''))) != 'GARANTIA' OR (COALESCE(valor_total, 0) - COALESCE(valor_desconto, 0)) >= 0)
GROUP BY dia
ORDER BY dia;
""", "4. DIA A DIA - JUNHO 2026")

# ========================
# 5. ANÁLISE DIA A DIA - MAIO 2026
# ========================
run(client, f"""
SELECT 
  TO_CHAR(COALESCE(data_vencimento, data_venda), 'YYYY-MM-DD') as dia,
  COUNT(*) as qtd,
  SUM(valor_total - COALESCE(valor_desconto, 0)) as total_liquido
FROM dash_vendas
WHERE tenant_id = {TENANT_STR}
  AND COALESCE(data_vencimento, data_venda) >= '2026-05-01'
  AND COALESCE(data_vencimento, data_venda) <= '2026-05-31'
  AND UPPER(TRIM(status)) IN ('FATURADO', 'FINALIZADO', 'PROCESSADO')
  AND (UPPER(TRIM(COALESCE(especie, ''))) != 'GARANTIA' OR (COALESCE(valor_total, 0) - COALESCE(valor_desconto, 0)) >= 0)
GROUP BY dia
ORDER BY dia;
""", "5. DIA A DIA - MAIO 2026")

# ========================
# 6. VENDAS COM STATUS DIFERENTE (que poderiam estar fora da soma)
# ========================
run(client, f"""
SELECT 
  UPPER(TRIM(status)) as status_,
  COUNT(*) as qtd,
  SUM(valor_total - COALESCE(valor_desconto, 0)) as total
FROM dash_vendas
WHERE tenant_id = {TENANT_STR}
  AND COALESCE(data_vencimento, data_venda) >= '2026-04-01'
  AND COALESCE(data_vencimento, data_venda) <= '2026-06-30'
GROUP BY UPPER(TRIM(status))
ORDER BY total DESC NULLS LAST;
""", "6. TODOS OS STATUS - Distribuição completa (Abr-Jun 2026)")

# ========================
# 7. VERIFICAR SE HÁ DUPLICATAS (mesmo id_firebird aparecendo mais de uma vez)
# ========================
run(client, f"""
SELECT id_firebird, COUNT(*) as cnt, SUM(valor_total - COALESCE(valor_desconto, 0)) as total
FROM dash_vendas
WHERE tenant_id = {TENANT_STR}
  AND COALESCE(data_vencimento, data_venda) >= '2026-04-01'
  AND COALESCE(data_vencimento, data_venda) <= '2026-06-30'
  AND UPPER(TRIM(status)) IN ('FATURADO', 'FINALIZADO', 'PROCESSADO')
GROUP BY id_firebird
HAVING COUNT(*) > 1
ORDER BY cnt DESC
LIMIT 20;
""", "7. VERIFICAÇÃO DE DUPLICATAS (id_firebird duplicado no período)")

# ========================
# 8. CONFERÊNCIA DOS ESPÉCIE GARANTIA - Quanto está sendo excluído
# ========================
run(client, f"""
SELECT 
  UPPER(TRIM(COALESCE(especie, 'NULL'))) as especie_,
  COUNT(*) as qtd,
  SUM(valor_total - COALESCE(valor_desconto, 0)) as total
FROM dash_vendas
WHERE tenant_id = {TENANT_STR}
  AND COALESCE(data_vencimento, data_venda) >= '2026-04-01'
  AND COALESCE(data_vencimento, data_venda) <= '2026-06-30'
  AND UPPER(TRIM(status)) IN ('FATURADO', 'FINALIZADO', 'PROCESSADO')
GROUP BY UPPER(TRIM(COALESCE(especie, 'NULL')))
ORDER BY total DESC;
""", "8. DISTRIBUIÇÃO POR ESPÉCIE (quais são excluídas pelo filtro GARANTIA)")

client.close()
print("\n=== AUDITORIA CONCLUÍDA ===")

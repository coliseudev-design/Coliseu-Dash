"""
ANÁLISE FINAL: Vendas negativas por espécie que estão reduzindo o faturamento no Dash
mas o ERP não as considera no relatório de faturamento.

ERP: Abril=608819.01  Maio=1776423.83  Junho=1488803.85
Dash sem filtro de garantia: Abril=597102.09  Maio=1744178.94  Junho=1478225.41

Wait - isso está mostrando que MESMO SEM filtro, o Dash é menor que ERP.
Isso confirma que há vendas no ERP que não foram sincronizadas para o banco.

Vamos comparar:
- Dash TOTAL bruto (sum valor_total - desconto, todos status): 
  Abril: 597102.09 (1330 registros)
  
- ERP mostra: 608819.01

Diferença bruta (antes de qualquer filtro): 
  Abril: 608819.01 - 597102.09 = 11716.92 (há mais vendas no ERP)
  
Mas com o filtro: 601272.45 (com filtro GARANTIA)
ERP: 608819.01
Diferença: 7546.56

Conclusão: As vendas negativas de outras espécies (MECANICO, DUPLICATA, BOLETO negativo, PIX negativo)
estão reduzindo o faturamento do Dashboard, mas o ERP as trata diferente.

O ERP pode estar incluindo APENAS as vendas positivas (notas de venda),
excluindo todas as entradas negativas (devoluções de qualquer espécie).
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
# 1. SOMENTE VENDAS POSITIVAS (valor_total > 0) - ver total
# ========================================================
run(client, f"""
SELECT 
  TO_CHAR(data_venda, 'YYYY-MM') as mes,
  COUNT(*) as qtd,
  SUM(valor_total - COALESCE(valor_desconto, 0)) as total_positivas
FROM dash_vendas
WHERE tenant_id = {T}
  AND data_venda >= '2026-04-01'
  AND data_venda <= '2026-06-30'
  AND UPPER(TRIM(status)) IN ('FATURADO','FINALIZADO','PROCESSADO')
  AND (valor_total - COALESCE(valor_desconto, 0)) > 0
GROUP BY mes ORDER BY mes;
""", "1. SOMENTE VENDAS POSITIVAS (exclui tudo negativo)")

# ========================================================
# 2. BREAKDOWN DAS NEGATIVAS POR ESPÉCIE (valor liquido < 0)
#    Para entender o que deveria ou não ser deduzido
# ========================================================
run(client, f"""
SELECT 
  TO_CHAR(data_venda, 'YYYY-MM') as mes,
  UPPER(TRIM(COALESCE(especie,'NULL'))) as especie_,
  COUNT(*) as qtd,
  SUM(valor_total - COALESCE(valor_desconto, 0)) as total_negativo
FROM dash_vendas
WHERE tenant_id = {T}
  AND data_venda >= '2026-04-01'
  AND data_venda <= '2026-06-30'
  AND UPPER(TRIM(status)) IN ('FATURADO','FINALIZADO','PROCESSADO')
  AND (valor_total - COALESCE(valor_desconto, 0)) < 0
GROUP BY mes, UPPER(TRIM(COALESCE(especie,'NULL')))
ORDER BY mes, total_negativo ASC;
""", "2. TODAS AS NEGATIVAS POR ESPÉCIE (o que reduz o faturamento)")

# ========================================================
# 3. SE EXCLUIRMOS TODAS AS NEGATIVAS, ficamos mais próximos do ERP?
# ========================================================
run(client, f"""
SELECT 
  TO_CHAR(data_venda, 'YYYY-MM') as mes,
  SUM(CASE WHEN (valor_total - COALESCE(valor_desconto, 0)) >= 0 
      THEN valor_total - COALESCE(valor_desconto, 0) ELSE 0 END) as somente_positivas,
  SUM(valor_total - COALESCE(valor_desconto, 0)) as com_todas_negativas,
  SUM(CASE WHEN (valor_total - COALESCE(valor_desconto, 0)) < 0 
      THEN valor_total - COALESCE(valor_desconto, 0) ELSE 0 END) as total_negativas
FROM dash_vendas
WHERE tenant_id = {T}
  AND data_venda >= '2026-04-01'
  AND data_venda <= '2026-06-30'
  AND UPPER(TRIM(status)) IN ('FATURADO','FINALIZADO','PROCESSADO')
  AND UPPER(TRIM(COALESCE(especie,''))) != 'GARANTIA'
GROUP BY mes ORDER BY mes;
""", "3. POSITIVAS vs NEGATIVAS: comparar com ERP (608819/1776423/1488803)")

# ========================================================
# 4. DETALHE DAS PIX NEGATIVAS DE MAIO (R$ -38.470,30)
# ========================================================
run(client, f"""
SELECT 
  id_firebird,
  TO_CHAR(data_venda,'DD/MM/YYYY') as data,
  especie,
  valor_total,
  valor_desconto,
  (valor_total - COALESCE(valor_desconto,0)) as liquido,
  numero_pedido
FROM dash_vendas
WHERE tenant_id = {T}
  AND data_venda >= '2026-05-01'
  AND data_venda <= '2026-05-31'
  AND UPPER(TRIM(status)) IN ('FATURADO','FINALIZADO','PROCESSADO')
  AND (valor_total - COALESCE(valor_desconto,0)) < 0
  AND UPPER(TRIM(COALESCE(especie,''))) NOT IN ('GARANTIA','DEVOLUCAO DE CLIENTE')
ORDER BY (valor_total - COALESCE(valor_desconto,0)) ASC
LIMIT 30;
""", "4. DETALHES DAS NEGATIVAS DE MAIO (exceto GARANTIA e DEVOLUCAO DE CLIENTE)")

client.close()
print("\n=== ANÁLISE CONCLUÍDA ===")

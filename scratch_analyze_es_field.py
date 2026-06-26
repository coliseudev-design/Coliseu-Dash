"""
HIPÓTESE FINAL: Devoluções no ERP Coliseu geram 2 registros espelhados (ES=1 e ES=2)
O Dashboard soma os dois (-X + -X = -2X), mas o ERP conta apenas uma vez.
Verificar se a regra é: excluir as entradas negativas com ES=2 (ou processo=2)
"""
import paramiko

HOST = '2.24.82.19'
USER = 'root'
PASS = 'Col@13894645'
CONTAINER = 'vasjsucz4yxcb7m4rtqindd2'
T = "'2395efd5-6476-4f3c-a7b8-f31d5567b42f'"
FILTER_STATUS = "AND UPPER(TRIM(status)) IN ('FATURADO','FINALIZADO','PROCESSADO')"
FILTER_GARANTIA = "AND (UPPER(TRIM(COALESCE(especie,''))) != 'GARANTIA' OR (COALESCE(valor_total,0)-COALESCE(valor_desconto,0))>=0)"

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
# 1. Verificar distribuição ES e PROCESSO nas vendas negativas
# ========================================================
run(client, f"""
SELECT 
  TO_CHAR(data_venda, 'YYYY-MM') as mes,
  es, processo,
  COUNT(*) as qtd,
  SUM(valor_total - COALESCE(valor_desconto,0)) as total
FROM dash_vendas
WHERE tenant_id = {T}
  AND data_venda >= '2026-04-01'
  AND data_venda <= '2026-06-30'
  {FILTER_STATUS}
  AND (valor_total - COALESCE(valor_desconto,0)) < 0
  AND UPPER(TRIM(COALESCE(especie,''))) NOT IN ('GARANTIA')
GROUP BY mes, es, processo
ORDER BY mes, es, processo;
""", "1. ES e PROCESSO das vendas negativas por mês")

# ========================================================
# 2. Calcular faturamento EXCLUINDO registros com ES=1 negativos (entrada negativa)
#    Hipótese: ES=2 é a devolução "nota fiscal", ES=1 é o acerto interno
# ========================================================
run(client, f"""
SELECT 
  TO_CHAR(data_venda, 'YYYY-MM') as mes,
  -- Excluindo negativos com ES=1 (mantendo ES=2 negative como a devolução real)
  SUM(CASE WHEN (valor_total - COALESCE(valor_desconto,0)) >= 0 OR es = 2
      THEN valor_total - COALESCE(valor_desconto,0) ELSE 0 END) as excluindo_es1_neg,
  -- Excluindo negativos com ES=2 (mantendo ES=1 negative como a devolução real)
  SUM(CASE WHEN (valor_total - COALESCE(valor_desconto,0)) >= 0 OR es = 1
      THEN valor_total - COALESCE(valor_desconto,0) ELSE 0 END) as excluindo_es2_neg,
  -- Total atual
  SUM(valor_total - COALESCE(valor_desconto,0)) as total_atual,
  -- ERP referência
  CASE TO_CHAR(data_venda, 'YYYY-MM') 
    WHEN '2026-04' THEN 608819.01
    WHEN '2026-05' THEN 1776423.83
    WHEN '2026-06' THEN 1488803.85
  END as erp
FROM dash_vendas
WHERE tenant_id = {T}
  AND data_venda >= '2026-04-01'
  AND data_venda <= '2026-06-30'
  {FILTER_STATUS}
  AND UPPER(TRIM(COALESCE(especie,''))) != 'GARANTIA'
GROUP BY mes ORDER BY mes;
""", "2. SIMULAÇÃO: excluindo negativos ES=1 ou ES=2 - qual bate com ERP?")

# ========================================================
# 3. OLHAR A DISTRIBUIÇÃO COMPLETA DE ES NAS POSITIVAS TAMBÉM
# ========================================================
run(client, f"""
SELECT 
  TO_CHAR(data_venda, 'YYYY-MM') as mes,
  es,
  CASE WHEN (valor_total - COALESCE(valor_desconto,0)) > 0 THEN 'positiva'
       ELSE 'negativa' END as tipo,
  COUNT(*) as qtd,
  SUM(valor_total - COALESCE(valor_desconto,0)) as total
FROM dash_vendas
WHERE tenant_id = {T}
  AND data_venda >= '2026-04-01'
  AND data_venda <= '2026-06-30'
  {FILTER_STATUS}
  AND UPPER(TRIM(COALESCE(especie,''))) != 'GARANTIA'
GROUP BY mes, es, tipo
ORDER BY mes, es, tipo;
""", "3. DISTRIBUIÇÃO COMPLETA: ES por positivas/negativas")

# ========================================================
# 4. FATURAMENTO SOMENTE COM ES=2 (vendas de saída)
# ========================================================
run(client, f"""
SELECT 
  TO_CHAR(data_venda, 'YYYY-MM') as mes,
  COUNT(*) as qtd,
  SUM(valor_total - COALESCE(valor_desconto,0)) as faturamento_es2_apenas
FROM dash_vendas
WHERE tenant_id = {T}
  AND data_venda >= '2026-04-01'
  AND data_venda <= '2026-06-30'
  {FILTER_STATUS}
  AND UPPER(TRIM(COALESCE(especie,''))) != 'GARANTIA'
  AND es = 2
GROUP BY mes ORDER BY mes;
""", "4. FATURAMENTO SOMENTE ES=2 (vendas de saída do ERP)")

client.close()
print("\n=== CONCLUÍDO ===")

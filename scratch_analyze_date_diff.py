"""
ANÁLISE DEFINITIVA DAS DIFERENÇAS RESTANTES
Hipótese: ERP usa data_venda (emissão), Dashboard usa COALESCE(data_vencimento, data_venda)
→ Vendas com data_vencimento em mês diferente da data_venda ficam no mês errado no Dashboard

ERP correto:       Abril=608819.01  Maio=1776423.83  Junho=1488803.85
Dashboard atual:   Abril=601272.45  Maio=1754226.81  Junho=1488291.85
Diferença:         Abril=-7546.56   Maio=-22197.02   Junho=-512.00
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
# 1. COMPARAR DUAS FORMAS DE AGRUPAMENTO POR MÊS
#    A) por data_venda (como o ERP faz)
#    B) por COALESCE(data_vencimento, data_venda) (como o Dash faz)
# ========================================================
run(client, f"""
SELECT 
  TO_CHAR(data_venda, 'YYYY-MM') as mes_emissao,
  COUNT(*) as qtd,
  SUM(valor_total - COALESCE(valor_desconto, 0)) as total_por_emissao
FROM dash_vendas
WHERE tenant_id = {T}
  AND data_venda >= '2026-04-01'
  AND data_venda <= '2026-06-30'
  {FILTER}
GROUP BY mes_emissao
ORDER BY mes_emissao;
""", "1A. TOTAIS AGRUPADOS POR data_venda (como ERP)")

run(client, f"""
SELECT 
  TO_CHAR(COALESCE(data_vencimento, data_venda), 'YYYY-MM') as mes_vencimento,
  COUNT(*) as qtd,
  SUM(valor_total - COALESCE(valor_desconto, 0)) as total_por_vencimento
FROM dash_vendas
WHERE tenant_id = {T}
  AND COALESCE(data_vencimento, data_venda) >= '2026-04-01'
  AND COALESCE(data_vencimento, data_venda) <= '2026-06-30'
  {FILTER}
GROUP BY mes_vencimento
ORDER BY mes_vencimento;
""", "1B. TOTAIS AGRUPADOS POR data_vencimento (como Dashboard)")

# ========================================================
# 2. VENDAS COM DATAS EM MESES DIFERENTES
#    data_venda em mês X mas data_vencimento em mês Y
# ========================================================
run(client, f"""
SELECT 
  TO_CHAR(data_venda, 'YYYY-MM') as mes_emissao,
  TO_CHAR(data_vencimento, 'YYYY-MM') as mes_vencimento,
  COUNT(*) as qtd,
  SUM(valor_total - COALESCE(valor_desconto, 0)) as total
FROM dash_vendas
WHERE tenant_id = {T}
  AND data_venda >= '2026-04-01'
  AND data_venda <= '2026-06-30'
  AND data_vencimento IS NOT NULL
  AND TO_CHAR(data_venda, 'YYYY-MM') != TO_CHAR(data_vencimento, 'YYYY-MM')
  {FILTER}
GROUP BY mes_emissao, mes_vencimento
ORDER BY mes_emissao, mes_vencimento;
""", "2. VENDAS COM data_venda e data_vencimento EM MESES DIFERENTES")

# ========================================================
# 3. AGRUPAMENTO POR data_venda - DIA A DIA JUNHO
#    Para comparar direto com o ERP dia a dia
# ========================================================
run(client, f"""
SELECT 
  TO_CHAR(data_venda, 'YYYY-MM-DD') as dia_emissao,
  COUNT(*) as qtd,
  SUM(valor_total - COALESCE(valor_desconto, 0)) as total
FROM dash_vendas
WHERE tenant_id = {T}
  AND data_venda >= '2026-06-01'
  AND data_venda <= '2026-06-30'
  {FILTER}
GROUP BY dia_emissao
ORDER BY dia_emissao;
""", "3. JUNHO DIA A DIA - por data_venda (emissão)")

# ========================================================
# 4. QUAL É O CAMPO QUE O ERP USA? VERIFICAR SE data_vencimento = data_venda
#    para a maioria das vendas (sem prazo / à vista)
# ========================================================
run(client, f"""
SELECT 
  CASE 
    WHEN data_vencimento IS NULL THEN 'sem_vencimento'
    WHEN data_venda::date = data_vencimento::date THEN 'mesma_data'
    WHEN data_venda::date != data_vencimento::date THEN 'datas_diferentes'
  END as situacao,
  COUNT(*) as qtd,
  SUM(valor_total - COALESCE(valor_desconto, 0)) as total
FROM dash_vendas
WHERE tenant_id = {T}
  AND data_venda >= '2026-04-01'
  AND data_venda <= '2026-06-30'
  {FILTER}
GROUP BY situacao
ORDER BY qtd DESC;
""", "4. PROPORÇÃO: datas iguais vs diferentes vs sem vencimento")

# ========================================================
# 5. TOTAL POR data_venda SEM RESTRICAO DE VENCIMENTO
#    (para confirmar: ERP soma tudo por data_venda, independente de vencimento)
# ========================================================
run(client, f"""
WITH por_emissao AS (
  SELECT 
    TO_CHAR(data_venda, 'YYYY-MM') as mes,
    SUM(valor_total - COALESCE(valor_desconto, 0)) as total_emissao
  FROM dash_vendas
  WHERE tenant_id = {T}
    AND data_venda >= '2026-04-01'
    AND data_venda <= '2026-06-30'
    {FILTER}
  GROUP BY mes
),
por_vencimento AS (
  SELECT 
    TO_CHAR(COALESCE(data_vencimento, data_venda), 'YYYY-MM') as mes,
    SUM(valor_total - COALESCE(valor_desconto, 0)) as total_vencimento
  FROM dash_vendas
  WHERE tenant_id = {T}
    AND COALESCE(data_vencimento, data_venda) >= '2026-04-01'
    AND COALESCE(data_vencimento, data_venda) <= '2026-06-30'
    {FILTER}
  GROUP BY mes
)
SELECT 
  COALESCE(e.mes, v.mes) as mes,
  COALESCE(e.total_emissao, 0) as por_emissao_erp,
  COALESCE(v.total_vencimento, 0) as por_vencimento_dash,
  COALESCE(e.total_emissao, 0) - COALESCE(v.total_vencimento, 0) as diferenca
FROM por_emissao e
FULL OUTER JOIN por_vencimento v ON e.mes = v.mes
ORDER BY COALESCE(e.mes, v.mes);
""", "5. COMPARATIVO DIRETO: Emissão (ERP) vs Vencimento (Dash)")

client.close()
print("\n=== ANÁLISE CONCLUÍDA ===")

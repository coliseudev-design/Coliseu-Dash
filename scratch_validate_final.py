"""
VALIDAÇÃO FINAL - Verificar os novos totais após a correção do cfop.js
Simula exatamente a query que o middleware usa agora para faturamento.
"""
import paramiko

HOST = '2.24.82.19'
USER = 'root'
PASS = 'Col@13894645'
CONTAINER = 'vasjsucz4yxcb7m4rtqindd2'
TENANT = '2395efd5-6476-4f3c-a7b8-f31d5567b42f'

def run(client, sql, desc=""):
    cmd = f"docker exec {CONTAINER} psql -U coliseu_admin -d coliseu_dashboard -c \"{sql}\""
    _, stdout, _ = client.exec_command(cmd)
    out = stdout.read().decode('utf-8')
    if desc:
        print(f"\n{'='*60}")
        print(f"=== {desc} ===")
        print('='*60)
    print(out)
    return out

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PASS, timeout=20)
T = f"'{TENANT}'"

# Novo filtro (após correção):
# AND UPPER(TRIM(status)) IN ('FATURADO', 'FINALIZADO', 'PROCESSADO') 
# AND UPPER(TRIM(COALESCE(especie, ''))) NOT IN ('GARANTIA', 'DEVOLUCAO DE CLIENTE')

NEW_FILTER = """
  AND UPPER(TRIM(status)) IN ('FATURADO', 'FINALIZADO', 'PROCESSADO')
  AND UPPER(TRIM(COALESCE(especie, ''))) NOT IN ('GARANTIA', 'DEVOLUCAO DE CLIENTE')
"""

# ========================
# 1. TOTAIS MENSAIS com novo filtro
# ========================
run(client, f"""
SELECT 
  TO_CHAR(COALESCE(data_vencimento, data_venda), 'YYYY-MM') as mes,
  COUNT(*) as qtd_vendas,
  SUM(valor_total - COALESCE(valor_desconto, 0)) as faturamento_novo
FROM dash_vendas
WHERE tenant_id = {T}
  AND COALESCE(data_vencimento, data_venda) >= '2026-04-01'
  AND COALESCE(data_vencimento, data_venda) <= '2026-06-30'
  {NEW_FILTER}
GROUP BY mes
ORDER BY mes;
""", "TOTAIS MENSAIS COM NOVO FILTRO (Abr-Jun 2026)")

# ========================
# 2. DIA A DIA JUNHO com novo filtro
# ========================
run(client, f"""
SELECT 
  TO_CHAR(COALESCE(data_vencimento, data_venda), 'YYYY-MM-DD') as dia,
  COUNT(*) as qtd,
  SUM(valor_total - COALESCE(valor_desconto, 0)) as total
FROM dash_vendas
WHERE tenant_id = {T}
  AND COALESCE(data_vencimento, data_venda) >= '2026-06-01'
  AND COALESCE(data_vencimento, data_venda) <= '2026-06-30'
  {NEW_FILTER}
GROUP BY dia
ORDER BY dia;
""", "JUNHO 2026 - DIA A DIA (novo filtro)")

# ========================
# 3. DIA A DIA MAIO com novo filtro
# ========================
run(client, f"""
SELECT 
  TO_CHAR(COALESCE(data_vencimento, data_venda), 'YYYY-MM-DD') as dia,
  COUNT(*) as qtd,
  SUM(valor_total - COALESCE(valor_desconto, 0)) as total
FROM dash_vendas
WHERE tenant_id = {T}
  AND COALESCE(data_vencimento, data_venda) >= '2026-05-01'
  AND COALESCE(data_vencimento, data_venda) <= '2026-05-31'
  {NEW_FILTER}
GROUP BY dia
ORDER BY dia;
""", "MAIO 2026 - DIA A DIA (novo filtro)")

# ========================
# 4. Confirmação que o filtro está no container (grep no arquivo live)
# ========================
MW_CONTAINER = 'dashboard-middleware-g115wwb76cltjli9wew0cgfi-184215157942'
_, out2, _ = client.exec_command(
    f"docker exec {MW_CONTAINER} grep 'DEVOLUCAO' /usr/src/app/src/utils/cfop.js"
)
print("\n=== CONFIRMAÇÃO DO FILTRO NO CONTAINER ===")
print(out2.read().decode('utf-8'))

client.close()
print("\n=== VALIDAÇÃO FINAL CONCLUÍDA ===")

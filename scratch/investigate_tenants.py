import paramiko

SSH_HOST = '177.39.17.7'
SSH_USER = 'root'
SSH_PASS = '6EFBC!c0:wzr%Ij'
DB_CONTAINER = "coliseu-db-thyqkc5gkvp7i1nld555wakz-172547374937"
DB_USER = "coliseu_admin"
DB_NAME = "coliseu_dashboard"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(SSH_HOST, username=SSH_USER, password=SSH_PASS)

def pg(sql):
    safe = sql.replace("'", "'\\''")
    cmd = f"docker exec {DB_CONTAINER} psql -U {DB_USER} -d {DB_NAME} -t -A -F'|' -c '{safe}' 2>&1"
    stdin, stdout, stderr = client.exec_command(cmd)
    return stdout.read().decode('utf-8').strip()

# 1. TODOS os tenants e seus totais de junho
print("=== TODOS TENANTS - TOTAL JUNHO 2026 ===")
r = pg("""
SELECT tenant_id,
       ROUND(SUM(valor_total - COALESCE(valor_desconto,0))::numeric,2) AS total,
       COUNT(*) AS qtd,
       MAX(data_venda)::date AS ultima_venda
FROM dash_vendas
WHERE data_venda >= '2026-06-01' AND data_venda < '2026-06-26'
  AND UPPER(TRIM(status)) IN ('FATURADO','FINALIZADO','PROCESSADO')
  AND UPPER(TRIM(COALESCE(especie,''))) != 'GARANTIA'
GROUP BY tenant_id
ORDER BY total DESC
""")
for line in r.split('\n'):
    if '|' in line:
        parts = line.split('|')
        print(f"  tenant: {parts[0]}  total: R${float(parts[1]):>14,.2f}  qtd:{parts[2]}  ultima:{parts[3]}")

# 2. Total geral de todas as vendas no banco
print("\n=== TODOS TENANTS - TOTAL GERAL (qualquer data) ===")
r2 = pg("""
SELECT tenant_id,
       COUNT(*) AS qtd,
       MAX(data_venda)::date AS ultima_venda,
       MIN(data_venda)::date AS primeira_venda
FROM dash_vendas
GROUP BY tenant_id
ORDER BY ultima_venda DESC
""")
print(r2)

# 3. Verificar se o tenant 2395efd5 tem QUALQUER dado
print("\n=== DADOS DO TENANT BRANDAO (2395efd5) ===")
r3 = pg("""
SELECT COUNT(*) AS total_registros,
       MAX(data_venda)::date AS ultima_venda,
       MIN(data_venda)::date AS primeira_venda,
       MAX(sincronizado_em) AS ultima_sync
FROM dash_vendas
WHERE tenant_id = '2395efd5-6476-4f3c-a7b8-f31d5567b42f'
""")
print(r3)

# 4. Verificar appsettings do worker que está rodando - logs do middleware
print("\n=== LOGS RECENTES DO MIDDLEWARE (ultimas 50 linhas) ===")
MW = "dashboard-middleware-irerzifjwjb4q8ucbpfk2gb8-010725354985"
stdin, stdout, stderr = client.exec_command(f"docker logs {MW} --tail 50 2>&1")
logs = stdout.read().decode('utf-8', errors='replace')
# Filtrar linhas relevantes
for line in logs.split('\n'):
    if any(x in line.lower() for x in ['tenant', 'sync', 'error', 'brandao', '2395', 'venda', 'worker']):
        print(f"  {line}")

client.close()

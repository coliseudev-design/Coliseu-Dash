import paramiko

SSH_HOST = '177.39.17.7'
SSH_USER = 'root'
SSH_PASS = '6EFBC!c0:wzr%Ij'
DB_CONTAINER = "coliseu-db"
DB_USER = "coliseu_admin"
DB_NAME = "coliseu_dashboard"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(SSH_HOST, username=SSH_USER, password=SSH_PASS)

def pg(sql):
    cmd = f'docker exec {DB_CONTAINER} psql -U {DB_USER} -d {DB_NAME} -t -A -F"|" -c "{sql}" 2>&1'
    stdin, stdout, stderr = client.exec_command(cmd)
    return stdout.read().decode('utf-8').strip()

# 1. Todos os tenants e seus volumes
print("=== TODOS OS TENANTS COM VENDAS JUNHO 2026 ===")
r = pg("""
SELECT tenant_id,
       COUNT(*) as qtd,
       ROUND(SUM(valor_total - COALESCE(valor_desconto,0))::numeric,2) as total,
       MIN(data_venda)::date as min_date,
       MAX(data_venda)::date as max_date
FROM dash_vendas
WHERE data_venda >= '2026-06-01' AND data_venda < '2026-06-26'
  AND UPPER(TRIM(status)) IN ('FATURADO','FINALIZADO','PROCESSADO')
GROUP BY tenant_id
ORDER BY total DESC
""")
print(r)

# 2. Todos os tenants existentes na tabela de vendas
print("\n=== TODOS OS TENANTS NA TABELA DASH_VENDAS ===")
r2 = pg("""
SELECT tenant_id,
       COUNT(*) as total_vendas,
       MAX(data_venda)::date as ultima_venda
FROM dash_vendas
GROUP BY tenant_id
ORDER BY ultima_venda DESC
""")
print(r2)

# 3. Verificar na tabela de companies/tenants se existe brandao
print("\n=== EMPRESAS CADASTRADAS (tabela companies/tenants) ===")
r3 = pg("""
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
  AND (table_name ILIKE '%compan%' OR table_name ILIKE '%tenant%' OR table_name ILIKE '%empresa%')
""")
print(r3)

# 4. Últimas sincronizações por tenant
print("\n=== ULTIMA SINCRONIZACAO POR TENANT ===")
r4 = pg("""
SELECT tenant_id,
       MAX(sincronizado_em) as ultima_sync,
       COUNT(*) as qtd,
       MAX(data_venda)::date as max_data
FROM dash_vendas
GROUP BY tenant_id
ORDER BY ultima_sync DESC NULLS LAST
""")
print(r4)

client.close()

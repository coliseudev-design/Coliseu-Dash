import paramiko

SSH_HOST = '177.39.17.7'
SSH_USER = 'root'
SSH_PASS = '6EFBC!c0:wzr%Ij'
DB_CONTAINER = "coliseu-db-thyqkc5gkvp7i1nld555wakz-172547374937"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(SSH_HOST, username=SSH_USER, password=SSH_PASS)

def pg(db, sql):
    cmd = f"""docker exec -e PGPASSWORD=ColiseuDB2026Prod {DB_CONTAINER} psql -U coliseu_admin -d {db} -t -A -F'|' -c "{sql}" 2>&1"""
    stdin, stdout, stderr = client.exec_command(cmd)
    return stdout.read().decode('utf-8', errors='replace').strip()

# Empresas cadastradas no identity
print("=== EMPRESAS (coliseu_identity.companies) ===")
r = pg("coliseu_identity", "SELECT id, name, document, active, created_at::date FROM companies ORDER BY created_at DESC")
for line in r.split('\n'):
    if '|' in line:
        parts = line.split('|')
        print(f"  id:{parts[0]}  nome:{parts[1]:<30}  doc:{parts[2]:<20}  ativo:{parts[3]}  criado:{parts[4]}")

# Verificar o tenant cbf8cb59 no dashboard - esse tem 500 vendas e pode ser o Brandão
print("\n=== TENANT cbf8cb59 - DETALHES ===")
r2 = pg("coliseu_dashboard", """
SELECT TO_CHAR(COALESCE(data_vencimento,data_venda),'YYYY-MM-DD') AS dia,
       ROUND(SUM(valor_total - COALESCE(valor_desconto,0))::numeric,2) AS total,
       COUNT(*) AS qtd
FROM dash_vendas
WHERE tenant_id = 'cbf8cb59-47ab-4640-a0fc-7c4f207823de'
  AND COALESCE(data_vencimento,data_venda) >= '2026-06-01'
  AND COALESCE(data_vencimento,data_venda) < '2026-06-26'
  AND UPPER(TRIM(status)) IN ('FATURADO','FINALIZADO','PROCESSADO')
  AND UPPER(TRIM(COALESCE(especie,''))) != 'GARANTIA'
GROUP BY 1 ORDER BY 1
""")
print(r2 if r2 else "SEM DADOS JUNHO")

print("\n=== TOTAL JUNHO cbf8cb59 ===")
r3 = pg("coliseu_dashboard", """
SELECT ROUND(SUM(valor_total - COALESCE(valor_desconto,0))::numeric,2) total, COUNT(*) qtd
FROM dash_vendas
WHERE tenant_id = 'cbf8cb59-47ab-4640-a0fc-7c4f207823de'
  AND COALESCE(data_vencimento,data_venda) >= '2026-06-01'
  AND COALESCE(data_vencimento,data_venda) < '2026-06-26'
  AND UPPER(TRIM(status)) IN ('FATURADO','FINALIZADO','PROCESSADO')
  AND UPPER(TRIM(COALESCE(especie,''))) != 'GARANTIA'
""")
print(r3)

# Verificar todos tenants no identity
print("\n=== DEVICES/LICENCAS ===")
r4 = pg("coliseu_identity", "SELECT company_id, api_key, active, created_at::date FROM devices ORDER BY created_at DESC LIMIT 20")
for line in r4.split('\n'):
    if '|' in line:
        parts = line.split('|')
        print(f"  company:{parts[0]}  key:{parts[1]}  ativo:{parts[2]}  criado:{parts[3]}")

client.close()

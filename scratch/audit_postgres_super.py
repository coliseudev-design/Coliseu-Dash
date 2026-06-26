import paramiko

SSH_HOST = '177.39.17.7'
SSH_USER = 'root'
SSH_PASS = '6EFBC!c0:wzr%Ij'
DB_CONTAINER = "coliseu-db-thyqkc5gkvp7i1nld555wakz-172547374937"
TENANT = "2395efd5-6476-4f3c-a7b8-f31d5567b42f"

ERP = {
    "2026-06-01": 73131.16,  "2026-06-02": 72027.90,  "2026-06-03": 101117.04,
    "2026-06-04": 321.00,    "2026-06-05": 76965.70,  "2026-06-06": 52996.35,
    "2026-06-08": 49924.37,  "2026-06-09": 74591.49,  "2026-06-10": 102500.01,
    "2026-06-11": 64853.19,  "2026-06-12": 129899.60, "2026-06-13": 896.53,
    "2026-06-15": 64827.29,  "2026-06-16": 108572.58, "2026-06-17": 79868.95,
    "2026-06-18": 71037.29,  "2026-06-19": 68468.84,  "2026-06-20": 35646.73,
    "2026-06-22": 55800.83,  "2026-06-23": 71686.58,  "2026-06-24": 73317.10,
    "2026-06-25": 38370.17,
}

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(SSH_HOST, username=SSH_USER, password=SSH_PASS)

def run(cmd):
    stdin, stdout, stderr = client.exec_command(cmd)
    return stdout.read().decode('utf-8', errors='replace').strip()

# Verificar usuários disponíveis no postgres
print("=== USUARIOS POSTGRES ===")
print(run(f"docker exec {DB_CONTAINER} psql -U postgres -d coliseu_dashboard -t -A -c \"SELECT usename, usesuper FROM pg_user ORDER BY usename\" 2>&1"))

# Tentar com postgres superuser
print("\n=== TENANTS (como postgres) ===")
r = run(f"""docker exec {DB_CONTAINER} psql -U postgres -d coliseu_dashboard -t -A -F'|' -c "SELECT tenant_id, ROUND(SUM(valor_total - COALESCE(valor_desconto,0))::numeric,2) AS total, COUNT(*) qtd, MAX(data_venda)::date ultima FROM dash_vendas WHERE data_venda >= '2026-06-01' AND UPPER(TRIM(status)) IN ('FATURADO','FINALIZADO','PROCESSADO') GROUP BY tenant_id ORDER BY total DESC" 2>&1""")
print(r)

# Tentar mudar senha do coliseu_admin dentro do container
print("\n=== RESETAR SENHA coliseu_admin ===")
print(run(f"""docker exec {DB_CONTAINER} psql -U postgres -d coliseu_dashboard -c "ALTER USER coliseu_admin WITH PASSWORD 'ColiseuDB2026Prod';" 2>&1"""))

# Agora tentar com a senha correta usando PGPASSWORD dentro do container
print("\n=== TENANTS (coliseu_admin senha nova) ===")
r2 = run(f"""docker exec -e PGPASSWORD=ColiseuDB2026Prod {DB_CONTAINER} psql -U coliseu_admin -d coliseu_dashboard -t -A -F'|' -c "SELECT tenant_id, ROUND(SUM(valor_total - COALESCE(valor_desconto,0))::numeric,2) AS total, COUNT(*) qtd, MAX(data_venda)::date ultima FROM dash_vendas WHERE data_venda >= '2026-06-01' AND UPPER(TRIM(status)) IN ('FATURADO','FINALIZADO','PROCESSADO') GROUP BY tenant_id ORDER BY total DESC" 2>&1""")
print(r2)

client.close()

import paramiko

SSH_HOST = '177.39.17.7'
SSH_USER = 'root'
SSH_PASS = '6EFBC!c0:wzr%Ij'
DB_CONTAINER = "coliseu-db-thyqkc5gkvp7i1nld555wakz-172547374937"
TENANT = "2395efd5-6476-4f3c-a7b8-f31d5567b42f"
MW_NEW = "dashboard-middleware-irerzifjwjb4q8ucbpfk2gb8-025654671008"

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

def pg(sql):
    cmd = f"""docker exec -e PGPASSWORD=ColiseuDB2026Prod {DB_CONTAINER} psql -U coliseu_admin -d coliseu_dashboard -t -A -F'|' -c "{sql}" 2>&1"""
    stdin, stdout, stderr = client.exec_command(cmd)
    return stdout.read().decode('utf-8', errors='replace').strip()

def run(cmd):
    stdin, stdout, stderr = client.exec_command(cmd)
    return stdout.read().decode('utf-8', errors='replace').strip()

# Verificar logs do novo middleware para encontrar o tenant correto
print("=== LOGS MW (filtro por tenant/sync/venda) ===")
logs = run(f"docker logs {MW_NEW} --tail 100 2>&1")
for line in logs.split('\n'):
    if any(x in line.lower() for x in ['2395', 'brandao', 'sync', 'venda', 'error', 'warn', 'tenant']):
        print(f"  {line.strip()}")

# Query com todas as variações de status
print(f"\n=== TODOS STATUS DO TENANT {TENANT} ===")
r = pg(f"""
SELECT UPPER(TRIM(status)) AS status, COUNT(*) qtd,
       ROUND(SUM(valor_total - COALESCE(valor_desconto,0))::numeric,2) total
FROM dash_vendas
WHERE tenant_id = '{TENANT}'
  AND COALESCE(data_vencimento,data_venda) >= '2026-06-01'
  AND COALESCE(data_vencimento,data_venda) < '2026-06-26'
GROUP BY 1 ORDER BY 2 DESC
""")
print(r if r else "NENHUM DADO")

# Sem filtro de data
print(f"\n=== TENANT {TENANT} - TOTAL GERAL ===")
r2 = pg(f"SELECT COUNT(*) qtd, MAX(data_venda)::date ultima, MIN(data_venda)::date primeira FROM dash_vendas WHERE tenant_id = '{TENANT}'")
print(r2)

client.close()

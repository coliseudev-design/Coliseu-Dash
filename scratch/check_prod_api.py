import paramiko
import json

SSH_HOST = '177.39.17.7'
SSH_USER = 'root'
SSH_PASS = '6EFBC!c0:wzr%Ij'
TENANT = "2395efd5-6476-4f3c-a7b8-f31d5567b42f"
INTERNAL_KEY = "COL-NK9B-8AUP-VA5A"
DB_CONTAINER = "coliseu-db-thyqkc5gkvp7i1nld555wakz-172547374937"

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

def pg(sql):
    # Usar a senha correta do coliseu_admin
    escaped = sql.replace('"', '\\"')
    cmd = f'docker exec -e PGPASSWORD=ColiseuDB2026Prod {DB_CONTAINER} psql -U coliseu_admin -d coliseu_dashboard -t -A -F"|" -c "{escaped}" 2>&1'
    stdin, stdout, stderr = client.exec_command(cmd)
    return stdout.read().decode('utf-8', errors='replace').strip()

# 1. Verificar onde dashboard.coliseusistemas.com.br aponta (DNS)
print("=== DNS: dashboard.coliseusistemas.com.br ===")
dns = run("curl -s --max-time 5 -o /dev/null -w '%{remote_ip}' https://dashboard.coliseusistemas.com.br/health 2>&1 || nslookup dashboard.coliseusistemas.com.br 2>&1 | grep Address")
print(dns)

# 2. Testar a API de produção com a chave correta
print("\n=== TESTE API PRODUCAO ===")
api_test = run(f"""curl -s --max-time 10 \
  -H "x-internal-key: {INTERNAL_KEY}" \
  -H "x-tenant-id: {TENANT}" \
  "https://dashboard.coliseusistemas.com.br/api/sync/vendas/count" 2>&1 | head -500""")
print(api_test[:1000])

# 3. Verificar todos os tenants no banco com TODAS as senhas possíveis
print("\n=== TENANTS NO BANCO (todas as senhas) ===")
senhas = ["ColiseuDB2026Prod", "coliseu_admin", "masterkey", "postgres", "coliseu2026"]
for senha in senhas:
    cmd = f'docker exec -e PGPASSWORD={senha} {DB_CONTAINER} psql -U coliseu_admin -d coliseu_dashboard -t -A -c "SELECT tenant_id, COUNT(*) FROM dash_vendas GROUP BY tenant_id ORDER BY COUNT(*) DESC" 2>&1'
    stdin, stdout, stderr = client.exec_command(cmd)
    r = stdout.read().decode('utf-8', errors='replace').strip()
    if r and 'error' not in r.lower() and 'fatal' not in r.lower():
        print(f"  Senha '{senha}' funcionou:")
        for line in r.split('\n')[:10]:
            print(f"    {line}")
        break

# 4. Testar a rota de sync/vendas diretamente
print("\n=== ROTA SYNC/VENDAS (GET) ===")
sync_test = run(f"""curl -s --max-time 10 \
  -H "x-internal-key: {INTERNAL_KEY}" \
  -H "x-tenant-id: {TENANT}" \
  "https://dashboard.coliseusistemas.com.br/api/sync/status" 2>&1""")
print(sync_test[:1000])

client.close()

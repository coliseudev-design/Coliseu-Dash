import paramiko
import json

SSH_HOST = '177.39.17.7'
SSH_USER = 'root'
SSH_PASS = '6EFBC!c0:wzr%Ij'
TENANT = "2395efd5-6476-4f3c-a7b8-f31d5567b42f"
MW_KEY = "aQbY3eqVz2xd8PSr0AUKtfwFRo7n1IickE6sMGWTNCpXhZ95"

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

# Testar API do dashboard atual (novo deploy) com o tenant Brandão
MW_NEW = "dashboard-middleware-irerzifjwjb4q8ucbpfk2gb8-025654671008"
MW_PORT = "34403"

print("=== TESTE API MIDDLEWARE (novo deploy) ===")
# Testar endpoint de vendas
api_test = run(f"""curl -s -X GET "http://localhost:{MW_PORT}/api/vendas/resumo?dataInicio=2026-06-01&dataFim=2026-06-25" \
  -H "x-internal-key: {MW_KEY}" \
  -H "x-tenant-id: {TENANT}" 2>&1 | head -200""")
print(api_test[:2000])

print("\n=== ENDPOINT SAUDE ===")
health = run(f"curl -s http://localhost:{MW_PORT}/health 2>&1")
print(health)

print("\n=== ENDPOINT VENDAS DIA A DIA ===")
vendas = run(f"""curl -s "http://localhost:{MW_PORT}/api/vendas?dataInicio=2026-06-01&dataFim=2026-06-25&agrupamento=dia" \
  -H "x-internal-key: {MW_KEY}" \
  -H "x-tenant-id: {TENANT}" 2>&1""")
try:
    data = json.loads(vendas)
    print(json.dumps(data, indent=2, ensure_ascii=False)[:3000])
except:
    print(vendas[:2000])

client.close()

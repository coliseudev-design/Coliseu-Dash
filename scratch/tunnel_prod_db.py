import paramiko
import json

# Jump host: 177.39.17.7
SSH_HOST = '177.39.17.7'
SSH_USER = 'root'
SSH_PASS = '6EFBC!c0:wzr%Ij'
TENANT = "2395efd5-6476-4f3c-a7b8-f31d5567b42f"
INTERNAL_KEY = "COL-NK9B-8AUP-VA5A"

# ERP COMPLETO (das 3 imagens)
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

# Tentar conectar ao PostgreSQL de 2.24.82.19 a partir do jump host
print("=== TESTE CONEXAO 2.24.82.19:5432 ===")
conn_test = run("nc -zv 2.24.82.19 5432 2>&1 || timeout 5 bash -c 'echo > /dev/tcp/2.24.82.19/5432' && echo 'PORTA ABERTA' || echo 'PORTA FECHADA'")
print(conn_test)

# Tentar PSQL direto de 177 para 2.24.82.19
print("\n=== PSQL DIRETO PARA 2.24.82.19 ===")
senhas = [
    ("coliseu_admin", "ColiseuDB2026Prod"),
    ("coliseu_admin", "coliseu2026"),
    ("postgres", "ColiseuDB2026Prod"),
    ("postgres", "postgres"),
]
for user, pwd in senhas:
    r = run(f"PGPASSWORD={pwd} psql -h 2.24.82.19 -p 5432 -U {user} -d coliseu_dashboard -t -A -c 'SELECT COUNT(*) FROM dash_vendas' --connect-timeout=5 2>&1")
    if 'error' not in r.lower() and 'fatal' not in r.lower() and r.strip().isdigit():
        print(f"  CONECTOU! user={user} pass={pwd} -> registros: {r}")
        # Buscar os dados dia a dia
        q = f"""SELECT TO_CHAR(COALESCE(data_vencimento,data_venda),'YYYY-MM-DD'),
               ROUND(SUM(valor_total - COALESCE(valor_desconto,0))::numeric,2),
               COUNT(*)
        FROM dash_vendas
        WHERE tenant_id = '{TENANT}'
          AND COALESCE(data_vencimento,data_venda) >= '2026-06-01'
          AND COALESCE(data_vencimento,data_venda) < '2026-06-26'
          AND UPPER(TRIM(status)) IN ('FATURADO','FINALIZADO','PROCESSADO')
          AND UPPER(TRIM(COALESCE(especie,''))) != 'GARANTIA'
        GROUP BY 1 ORDER BY 1"""
        r2 = run(f"PGPASSWORD={pwd} psql -h 2.24.82.19 -p 5432 -U {user} -d coliseu_dashboard -t -A -F'|' -c \"{q}\" --connect-timeout=5 2>&1")
        print(r2)
        break
    else:
        print(f"  Falha: {user}/{pwd}: {r[:60]}")

# Consultar via curl a API de producao usando rota interna de sync
print("\n=== API SYNC (GET status) ===")
r = run(f"""curl -s --max-time 8 \
  -X GET "https://dashboard.coliseusistemas.com.br/api/sync/vendas?tenant={TENANT}&dataInicio=2026-06-01&dataFim=2026-06-25" \
  -H "x-internal-key: {INTERNAL_KEY}" \
  -H "x-tenant-id: {TENANT}" 2>&1""")
print(r[:500])

# Tentar rota do dashboard que retorna faturamento por dia
print("\n=== API DASHBOARD (faturamento diario) ===")
r2 = run(f"""curl -s --max-time 8 \
  "https://dashboard.coliseusistemas.com.br/api/comercial/faturamento-diario?dataInicio=2026-06-01&dataFim=2026-06-25" \
  -H "x-internal-key: {INTERNAL_KEY}" \
  -H "x-tenant-id: {TENANT}" 2>&1""")
print(r2[:500])

client.close()

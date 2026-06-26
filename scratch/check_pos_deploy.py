import paramiko
import time

SSH_HOST = '177.39.17.7'
SSH_USER = 'root'
SSH_PASS = '6EFBC!c0:wzr%Ij'
DB_CONTAINER = "coliseu-db-thyqkc5gkvp7i1nld555wakz-172547374937"
DB_USER = "coliseu_admin"
DB_NAME = "coliseu_dashboard"
TENANT = "2395efd5-6476-4f3c-a7b8-f31d5567b42f"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(SSH_HOST, username=SSH_USER, password=SSH_PASS)

def run(cmd):
    stdin, stdout, stderr = client.exec_command(cmd)
    return stdout.read().decode('utf-8', errors='replace').strip()

def pg(sql):
    safe = sql.replace("'", "'\\''")
    cmd = f"docker exec {DB_CONTAINER} psql -U {DB_USER} -d {DB_NAME} -t -A -F'|' -c '{safe}' 2>&1"
    stdin, stdout, stderr = client.exec_command(cmd)
    return stdout.read().decode('utf-8', errors='replace').strip()

print("=== CONTAINERS ATIVOS (pós-deploy) ===")
print(run("docker ps --format 'table {{.Names}}\t{{.Status}}' | grep -v coolify"))

print("\n=== DADOS DO TENANT BRANDAO TESTE ===")
r = pg(f"""
SELECT COUNT(*) as qtd,
       ROUND(SUM(valor_total - COALESCE(valor_desconto,0))::numeric,2) as total,
       MAX(data_venda)::date as ultima_venda,
       MAX(sincronizado_em) as ultima_sync
FROM dash_vendas
WHERE tenant_id = '{TENANT}'
  AND UPPER(TRIM(status)) IN ('FATURADO','FINALIZADO','PROCESSADO')
""")
print(r)

print("\n=== TOTAL JUNHO 2026 (BRANDAO TESTE) ===")
r2 = pg(f"""
SELECT ROUND(SUM(valor_total - COALESCE(valor_desconto,0))::numeric,2) as total_junho
FROM dash_vendas
WHERE tenant_id = '{TENANT}'
  AND COALESCE(data_vencimento, data_venda) >= '2026-06-01'
  AND COALESCE(data_vencimento, data_venda) < '2026-06-26'
  AND UPPER(TRIM(status)) IN ('FATURADO','FINALIZADO','PROCESSADO')
  AND UPPER(TRIM(COALESCE(especie,''))) != 'GARANTIA'
""")
print(f"Total Dashboard Junho: R$ {r2}")
print(f"Total ERP Junho:       R$ 1.466.820,70")

print("\n=== DIA A DIA BRANDAO TESTE (junho) ===")
r3 = pg(f"""
SELECT TO_CHAR(COALESCE(data_vencimento,data_venda),'YYYY-MM-DD') AS dia,
       ROUND(SUM(valor_total - COALESCE(valor_desconto,0))::numeric,2) AS total,
       COUNT(*) AS qtd
FROM dash_vendas
WHERE tenant_id = '{TENANT}'
  AND COALESCE(data_vencimento,data_venda) >= '2026-06-01'
  AND COALESCE(data_vencimento,data_venda) < '2026-06-26'
  AND UPPER(TRIM(status)) IN ('FATURADO','FINALIZADO','PROCESSADO')
  AND UPPER(TRIM(COALESCE(especie,''))) != 'GARANTIA'
GROUP BY 1 ORDER BY 1
""")

ERP = {
    "2026-06-01": 73131.16, "2026-06-02": 72027.90, "2026-06-03": 101117.04,
    "2026-06-04": 321.00,   "2026-06-05": 76965.70, "2026-06-06": 52996.35,
    "2026-06-08": 49924.37, "2026-06-09": 74591.49, "2026-06-10": 102500.01,
    "2026-06-11": 64853.19, "2026-06-12": 129899.60,"2026-06-13": 896.53,
    "2026-06-15": 64827.29, "2026-06-16": 108572.58,"2026-06-17": 79868.95,
    "2026-06-18": 71037.29, "2026-06-19": 68468.84, "2026-06-20": 35646.73,
    "2026-06-22": 55800.83, "2026-06-23": 71686.58, "2026-06-24": 73317.10,
    "2026-06-25": 38370.17,
}

dash_por_dia = {}
for line in r3.split('\n'):
    if '|' in line:
        parts = line.split('|')
        try: dash_por_dia[parts[0]] = (float(parts[1]), parts[2])
        except: pass

print(f"{'DATA':<14} {'ERP':>14} {'DASH':>14} {'DIFF':>12} {'QTD':>5}  STATUS")
print("-" * 75)
ok = 0
div = 0
for dia in sorted(set(list(ERP.keys()) + list(dash_por_dia.keys()))):
    erp_val = ERP.get(dia, 0.0)
    dash_val, qtd = dash_por_dia.get(dia, (0.0, "-"))
    diff = round(dash_val - erp_val, 2)
    if abs(diff) > 0.05:
        status = "[DIVERGE]"; div += 1
    else:
        status = "[OK]"; ok += 1
    print(f"{dia:<14} {erp_val:>14,.2f} {dash_val:>14,.2f} {diff:>+12,.2f} {qtd:>5}  {status}")

print("-" * 75)
print(f"OK: {ok} | DIVERGENCIAS: {div}")

client.close()

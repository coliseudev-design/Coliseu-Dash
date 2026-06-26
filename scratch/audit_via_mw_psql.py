import paramiko

SSH_HOST = '177.39.17.7'
SSH_USER = 'root'
SSH_PASS = '6EFBC!c0:wzr%Ij'
MW = "dashboard-middleware-irerzifjwjb4q8ucbpfk2gb8-025654671008"
TENANT = "2395efd5-6476-4f3c-a7b8-f31d5567b42f"

# ERP valores corretos
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

# Pegar PG_HOST e PG_PASSWORD reais do middleware
print("=== TODAS ENV DO MIDDLEWARE ===")
envs = run(f"docker exec {MW} env 2>&1")
pg_host = ""
pg_pass = ""
pg_user = ""
pg_db = ""
pg_port = "5432"
for line in envs.split('\n'):
    if line.startswith('PG_HOST='):
        pg_host = line.split('=',1)[1].strip()
    elif line.startswith('PG_PASSWORD='):
        pg_pass = line.split('=',1)[1].strip()
    elif line.startswith('PG_USER='):
        pg_user = line.split('=',1)[1].strip()
    elif line.startswith('PG_DATABASE='):
        pg_db = line.split('=',1)[1].strip()
    elif line.startswith('PG_PORT='):
        pg_port = line.split('=',1)[1].strip()

print(f"  PG_HOST={pg_host}")
print(f"  PG_PORT={pg_port}")
print(f"  PG_USER={pg_user}")
print(f"  PG_DATABASE={pg_db}")
print(f"  PG_PASSWORD={pg_pass}")

# Rodar psql DENTRO do container do middleware (que já tem acesso ao DB pelo hostname interno)
def mw_psql(sql):
    safe = sql.replace("'", "'\\''")
    cmd = f"docker exec {MW} sh -c \"PGPASSWORD='{pg_pass}' psql -h {pg_host} -p {pg_port} -U {pg_user} -d {pg_db} -t -A -F'|' -c '{safe}' 2>&1\""
    stdin, stdout, stderr = client.exec_command(cmd)
    return stdout.read().decode('utf-8', errors='replace').strip()

# Verificar se psql existe no MW
print("\n=== PSQL NO MIDDLEWARE? ===")
print(run(f"docker exec {MW} which psql 2>&1 || docker exec {MW} psql --version 2>&1"))

# Tentar conexão direta via node/curl dentro do container
print("\n=== TENANTS NO DB REAL (via MW) ===")
r = mw_psql(f"""
SELECT tenant_id,
       ROUND(SUM(valor_total - COALESCE(valor_desconto,0))::numeric,2) AS total,
       COUNT(*) AS qtd,
       MAX(data_venda)::date AS ultima
FROM dash_vendas
WHERE data_venda >= '2026-06-01'
  AND UPPER(TRIM(status)) IN ('FATURADO','FINALIZADO','PROCESSADO')
GROUP BY tenant_id ORDER BY total DESC
""")
print(r if r else "SEM RESULTADO")

print(f"\n=== DADOS TENANT {TENANT} (via MW) ===")
r2 = mw_psql(f"""
SELECT ROUND(SUM(valor_total - COALESCE(valor_desconto,0))::numeric,2) AS total,
       COUNT(*) AS qtd
FROM dash_vendas
WHERE tenant_id = '{TENANT}'
  AND COALESCE(data_vencimento,data_venda) >= '2026-06-01'
  AND COALESCE(data_vencimento,data_venda) < '2026-06-26'
  AND UPPER(TRIM(status)) IN ('FATURADO','FINALIZADO','PROCESSADO')
  AND UPPER(TRIM(COALESCE(especie,''))) != 'GARANTIA'
""")
print(r2 if r2 else "SEM RESULTADO")

print(f"\n=== DIA A DIA TENANT {TENANT} (via MW) ===")
r3 = mw_psql(f"""
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

dash_por_dia = {}
for line in r3.split('\n'):
    if '|' in line:
        parts = line.split('|')
        try: dash_por_dia[parts[0]] = (float(parts[1]), parts[2])
        except: pass

print(f"{'DATA':<14} {'ERP':>14} {'DASH':>14} {'DIFF':>12} {'QTD':>5}  STATUS")
print("-" * 75)
divergencias = []
total_e = 0.0; total_d = 0.0
for dia in sorted(set(list(ERP.keys()) + list(dash_por_dia.keys()))):
    ev = ERP.get(dia, 0.0)
    dv, qtd = dash_por_dia.get(dia, (0.0, "-"))
    diff = round(dv - ev, 2)
    total_e += ev; total_d += dv
    st = "[DIVERGE]" if abs(diff) > 0.05 else "[OK]"
    if abs(diff) > 0.05: divergencias.append((dia, ev, dv, diff))
    print(f"{dia:<14} {ev:>14,.2f} {dv:>14,.2f} {diff:>+12,.2f} {qtd:>5}  {st}")

print("-" * 75)
print(f"{'TOTAL':<14} {total_e:>14,.2f} {total_d:>14,.2f} {round(total_d-total_e,2):>+12,.2f}")
print(f"\nOK: {len(ERP)-len(divergencias)} | DIVERGENCIAS: {len(divergencias)}")

client.close()

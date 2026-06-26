import paramiko

SSH_HOST = '177.39.17.7'
SSH_USER = 'root'
SSH_PASS = '6EFBC!c0:wzr%Ij'
DB_CONTAINER = "coliseu-db-thyqkc5gkvp7i1nld555wakz-172547374937"
DB_USER = "coliseu_admin"
DB_PASS = "ColiseuDB2026Prod"
DB_NAME = "coliseu_dashboard"
TENANT = "2395efd5-6476-4f3c-a7b8-f31d5567b42f"

# Valores ERP (imagens 3,4,5)
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
ERP_TOTAL = 1466820.70
DASH_TOTAL = 1464094.36
DIFF_ESPERADA = DASH_TOTAL - ERP_TOTAL  # -2726.34

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(SSH_HOST, username=SSH_USER, password=SSH_PASS)

def pg(sql):
    safe = sql.replace("'", "'\\''")
    cmd = f"PGPASSWORD='{DB_PASS}' docker exec -e PGPASSWORD={DB_PASS} {DB_CONTAINER} psql -U {DB_USER} -d {DB_NAME} -t -A -F'|' -c '{safe}' 2>&1"
    stdin, stdout, stderr = client.exec_command(cmd)
    return stdout.read().decode('utf-8', errors='replace').strip()

# Verificar todos os tenants com senha correta
print("=== TODOS TENANTS (senha correta) ===")
r = pg("""
SELECT tenant_id,
       ROUND(SUM(valor_total - COALESCE(valor_desconto,0))::numeric,2) AS total,
       COUNT(*) AS qtd,
       MAX(data_venda)::date AS ultima
FROM dash_vendas
WHERE data_venda >= '2026-06-01'
  AND UPPER(TRIM(status)) IN ('FATURADO','FINALIZADO','PROCESSADO')
GROUP BY tenant_id ORDER BY total DESC
""")
print(r)

print(f"\n=== TENANT BRANDAO TESTE: {TENANT} ===")
r2 = pg(f"""
SELECT COUNT(*) qtd,
       ROUND(SUM(valor_total - COALESCE(valor_desconto,0))::numeric,2) total,
       MAX(data_venda)::date ultima
FROM dash_vendas
WHERE tenant_id = '{TENANT}'
  AND UPPER(TRIM(status)) IN ('FATURADO','FINALIZADO','PROCESSADO')
""")
print(r2)

print(f"\n=== DIA A DIA JUNHO - BRANDAO TESTE ===")
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

dash_por_dia = {}
for line in r3.split('\n'):
    if '|' in line:
        parts = line.split('|')
        try: dash_por_dia[parts[0]] = (float(parts[1]), parts[2])
        except: pass

print(f"{'DATA':<14} {'ERP':>14} {'DASH':>14} {'DIFF':>12} {'QTD':>5}  STATUS")
print("-" * 75)
divergencias = []
total_erp = 0.0
total_dash = 0.0
for dia in sorted(set(list(ERP.keys()) + list(dash_por_dia.keys()))):
    erp_val = ERP.get(dia, 0.0)
    dash_val, qtd = dash_por_dia.get(dia, (0.0, "-"))
    diff = round(dash_val - erp_val, 2)
    total_erp += erp_val
    total_dash += dash_val
    status = "[DIVERGE]" if abs(diff) > 0.05 else "[OK]"
    if abs(diff) > 0.05:
        divergencias.append((dia, erp_val, dash_val, diff))
    print(f"{dia:<14} {erp_val:>14,.2f} {dash_val:>14,.2f} {diff:>+12,.2f} {qtd:>5}  {status}")

print("-" * 75)
print(f"{'TOTAL':<14} {total_erp:>14,.2f} {total_dash:>14,.2f} {round(total_dash-total_erp,2):>+12,.2f}")
print(f"\nDIVERGENCIAS: {len(divergencias)} dias")

if divergencias:
    print(f"\n=== DETALHES DAS DIVERGENCIAS ===")
    for dia, erp_val, dash_val, diff in divergencias:
        print(f"\n[{dia}] ERP:{erp_val:,.2f} DASH:{dash_val:,.2f} DIFF:{diff:+,.2f}")
        det = pg(f"""
        SELECT id_firebird,
               ROUND((valor_total - COALESCE(valor_desconto,0))::numeric,2) AS net,
               UPPER(TRIM(COALESCE(especie,''))) AS especie,
               UPPER(TRIM(status)) AS status,
               TO_CHAR(data_venda,'YYYY-MM-DD') AS dv,
               TO_CHAR(data_vencimento,'YYYY-MM-DD') AS dvc
        FROM dash_vendas
        WHERE tenant_id = '{TENANT}'
          AND COALESCE(data_vencimento,data_venda) >= '{dia}'::date
          AND COALESCE(data_vencimento,data_venda) < '{dia}'::date + INTERVAL '1 day'
          AND UPPER(TRIM(status)) IN ('FATURADO','FINALIZADO','PROCESSADO')
          AND UPPER(TRIM(COALESCE(especie,''))) != 'GARANTIA'
        ORDER BY id_firebird
        """)
        for row in det.split('\n'):
            if '|' in row:
                p = row.split('|')
                print(f"  ID:{p[0]:>6} net:{float(p[1]):>10,.2f} | {p[2]:<20} | dv:{p[4]} dvc:{p[5]}")

client.close()

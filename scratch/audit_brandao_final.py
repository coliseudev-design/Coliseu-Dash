import paramiko

SSH_HOST = '177.39.17.7'
SSH_USER = 'root'
SSH_PASS = '6EFBC!c0:wzr%Ij'
DB_CONTAINER = "coliseu-db-thyqkc5gkvp7i1nld555wakz-172547374937"
DB_USER = "coliseu_admin"
DB_NAME = "coliseu_dashboard"
TENANT = "2395efd5-6476-4f3c-a7b8-f31d5567b42f"

# Valores corretos do ERP (imagens 3,4,5)
ERP = {
    "2026-06-01": 73131.16,
    "2026-06-02": 72027.90,
    "2026-06-03": 101117.04,
    "2026-06-04": 321.00,
    "2026-06-05": 76965.70,
    "2026-06-06": 52996.35,
    "2026-06-08": 49924.37,
    "2026-06-09": 74591.49,
    "2026-06-10": 102500.01,
    "2026-06-11": 64853.19,
    "2026-06-12": 129899.60,
    "2026-06-13": 896.53,
    "2026-06-15": 64827.29,
    "2026-06-16": 108572.58,
    "2026-06-17": 79868.95,
    "2026-06-18": 71037.29,
    "2026-06-19": 68468.84,
    "2026-06-20": 35646.73,
    "2026-06-22": 55800.83,
    "2026-06-23": 71686.58,
    "2026-06-24": 73317.10,
    "2026-06-25": 38370.17,
}

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(SSH_HOST, username=SSH_USER, password=SSH_PASS)

def pg(sql):
    safe = sql.replace("'", "'\\''")
    cmd = f"docker exec {DB_CONTAINER} psql -U {DB_USER} -d {DB_NAME} -t -A -F'|' -c '{safe}' 2>&1"
    stdin, stdout, stderr = client.exec_command(cmd)
    return stdout.read().decode('utf-8').strip()

# --- Query principal: Dashboard dia a dia ---
sql_dash = f"""
SELECT
  TO_CHAR(COALESCE(data_vencimento, data_venda), 'YYYY-MM-DD') AS dia,
  ROUND(SUM(valor_total - COALESCE(valor_desconto, 0))::numeric, 2) AS total,
  COUNT(*) AS qtd
FROM dash_vendas
WHERE tenant_id = '{TENANT}'
  AND COALESCE(data_vencimento, data_venda) >= '2026-06-01'
  AND COALESCE(data_vencimento, data_venda) < '2026-06-26'
  AND UPPER(TRIM(status)) IN ('FATURADO', 'FINALIZADO', 'PROCESSADO')
  AND UPPER(TRIM(COALESCE(especie, ''))) != 'GARANTIA'
GROUP BY 1 ORDER BY 1
"""

result = pg(sql_dash)
dash_por_dia = {}
dash_qtd = {}
for line in result.split('\n'):
    if '|' in line:
        parts = line.split('|')
        if len(parts) >= 3:
            try:
                dash_por_dia[parts[0]] = float(parts[1])
                dash_qtd[parts[0]] = parts[2]
            except:
                pass

print("=" * 85)
print(f"AUDITORIA BRANDAO TESTE | TENANT: {TENANT}")
print(f"ERP: R$ 1.466.820,70 | DASH: R$ 1.464.094,36 | DIFF esperada: -R$ 2.726,34")
print("=" * 85)
print(f"\n{'DATA':<14} {'ERP':>14} {'DASH':>14} {'DIFF':>12} {'QTD':>5}  STATUS")
print("-" * 80)

divergencias = []
total_erp = 0.0
total_dash_calc = 0.0

for dia in sorted(set(list(ERP.keys()) + list(dash_por_dia.keys()))):
    erp_val = ERP.get(dia, 0.0)
    dash_val = dash_por_dia.get(dia, 0.0)
    diff = round(dash_val - erp_val, 2)
    total_erp += erp_val
    total_dash_calc += dash_val
    qtd = dash_qtd.get(dia, "-")

    if abs(diff) > 0.05:
        status = "[DIVERGE]"
        divergencias.append((dia, erp_val, dash_val, diff))
    else:
        status = "[OK]"

    print(f"{dia:<14} {erp_val:>14,.2f} {dash_val:>14,.2f} {diff:>+12,.2f} {qtd:>5}  {status}")

print("-" * 80)
diff_total = round(total_dash_calc - total_erp, 2)
print(f"{'TOTAL':<14} {total_erp:>14,.2f} {total_dash_calc:>14,.2f} {diff_total:>+12,.2f}")

print(f"\n{'='*85}")
print(f"DIVERGENCIAS: {len(divergencias)} dias")
print(f"{'='*85}")

for dia, erp_val, dash_val, diff in divergencias:
    print(f"\n[DIA {dia}] ERP: R${erp_val:,.2f} | DASH: R${dash_val:,.2f} | DIFF: R${diff:+,.2f}")
    det = pg(f"""
    SELECT id_firebird,
           ROUND((valor_total - COALESCE(valor_desconto,0))::numeric,2) AS net,
           valor_total, valor_desconto,
           UPPER(TRIM(COALESCE(especie,''))) AS especie,
           UPPER(TRIM(status)) AS status,
           TO_CHAR(data_venda,'YYYY-MM-DD HH24:MI') AS dv,
           TO_CHAR(data_vencimento,'YYYY-MM-DD HH24:MI') AS dvc
    FROM dash_vendas
    WHERE tenant_id = '{TENANT}'
      AND COALESCE(data_vencimento, data_venda) >= '{dia}'::date
      AND COALESCE(data_vencimento, data_venda) < '{dia}'::date + INTERVAL '1 day'
      AND UPPER(TRIM(status)) IN ('FATURADO','FINALIZADO','PROCESSADO')
      AND UPPER(TRIM(COALESCE(especie,''))) != 'GARANTIA'
    ORDER BY id_firebird
    """)
    for row in det.split('\n'):
        if '|' in row:
            parts = row.split('|')
            print(f"   ID:{parts[0]:>6} net:{float(parts[1]):>10,.2f} | {parts[4]:<30} | dv:{parts[6]} dvc:{parts[7]}")

# GARANTIAS
print(f"\n{'='*85}")
print("GARANTIAS DO PERIODO:")
gars = pg(f"""
SELECT TO_CHAR(COALESCE(data_vencimento,data_venda),'YYYY-MM-DD') AS dia,
       id_firebird,
       ROUND((valor_total - COALESCE(valor_desconto,0))::numeric,2) AS net,
       especie, status
FROM dash_vendas
WHERE tenant_id = '{TENANT}'
  AND COALESCE(data_vencimento, data_venda) >= '2026-06-01'
  AND COALESCE(data_vencimento, data_venda) < '2026-06-26'
  AND UPPER(TRIM(COALESCE(especie,''))) = 'GARANTIA'
ORDER BY 1, 2
""")
total_g = 0.0
for g in gars.split('\n'):
    if '|' in g:
        parts = g.split('|')
        print(f"  {parts[0]} ID:{parts[1]:>6} net:{float(parts[2]):>10,.2f} | {parts[3]}")
        try: total_g += float(parts[2])
        except: pass
print(f"  TOTAL GARANTIAS: R$ {total_g:,.2f}")

client.close()
print("\nAuditoria concluida.")

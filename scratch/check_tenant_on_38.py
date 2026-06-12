import subprocess

HOST = '38.242.244.84'
USER = 'root'
DB_USER = 'coliseu_user'
DB_NAME = 'coliseu_db'

def run_query(label, sql):
    sql_escaped = sql.replace('"', '\\"')
    cmd = [
        'ssh',
        '-o', 'StrictHostKeyChecking=no',
        '-o', 'ConnectTimeout=8',
        f'{USER}@{HOST}',
        f'psql -U {DB_USER} -d {DB_NAME} -c "{sql_escaped}"'
    ]
    try:
        r = subprocess.run(cmd, capture_output=True, text=True, timeout=15)
        print(f"\n=== {label} ===")
        print(r.stdout or "(sem resultado)")
        if r.returncode != 0 and r.stderr:
            print("ERR:", r.stderr)
    except Exception as e:
        print(f"[ERRO] {label}: {e}")

# 1. Get list of all tenants and their count of sales
run_query("ALL TENANTS IN 38.242.244.84", "SELECT tenant_id, COUNT(*) FROM dash_vendas GROUP BY tenant_id")

# 2. Query monthly faturamento grouped by tenant
run_query(
    "MONTHLY FATURAMENTO (FATURADO+FINALIZADO) BY TENANT",
    """SELECT 
         tenant_id,
         TO_CHAR(data_venda, 'YYYY-MM') as mes,
         ROUND(SUM(valor_total)::numeric, 2) as total_bruto,
         COUNT(*) as total_pedidos
       FROM dash_vendas
       WHERE data_venda >= '2025-11-01' AND data_venda < '2026-07-01'
         AND TRIM(status) IN ('FATURADO', 'FINALIZADO')
       GROUP BY tenant_id, mes
       ORDER BY tenant_id, mes"""
)

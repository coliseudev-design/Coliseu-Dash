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

# 1. Search for thiago
run_query(
    "FIND THIAGO IN PRODUCTION",
    "SELECT tenant_id, email, nome, layout_version FROM dash_usuarios WHERE email LIKE '%thiago%'"
)

# 2. Search for tenant 3edd56b4 sales summary in Jan 2026
run_query(
    "VET SEED SALES SUMMARY JAN 2026",
    """SELECT COUNT(*) as total, COUNT(cfop) as com_cfop, SUM(valor_total) as total_valor
       FROM dash_vendas
       WHERE tenant_id = '3edd56b4-e002-48ed-8ecb-131c0c62dcfb'
         AND data_venda >= '2026-01-01' AND data_venda < '2026-02-01'"""
)

# 3. Check statuses and CFOPs for Vet Seed in Jan 2026
run_query(
    "VET SEED STATUS AND CFOP JAN 2026",
    """SELECT cfop, TRIM(status) as status, COUNT(*) as qtd, SUM(valor_total) as total
       FROM dash_vendas
       WHERE tenant_id = '3edd56b4-e002-48ed-8ecb-131c0c62dcfb'
         AND data_venda >= '2026-01-01' AND data_venda < '2026-02-01'
       GROUP BY cfop, TRIM(status)"""
)

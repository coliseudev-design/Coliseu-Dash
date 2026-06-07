import paramiko

HOST = '177.39.17.7'
USER = 'root'
PASS = '6EFBC!c0:wzr%Ij'
CONTAINER = 'coliseu-db-thyqkc5gkvp7i1nld555wakz-172547374937'

def run_query(label, sql, db="coliseu_dashboard_vet"):
    sql_escaped = sql.replace('"', '\\"')
    cmd = f'docker exec {CONTAINER} psql -U coliseu_admin -d {db} -c "{sql_escaped}"'
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        client.connect(HOST, username=USER, password=PASS)
        _, stdout, stderr = client.exec_command(cmd)
        out = stdout.read().decode('utf-8')
        err = stderr.read().decode('utf-8')
        print(f"\n=== {label} ===")
        print(out or "(sem resultado)")
    except Exception as e:
        print(f"[ERRO] {label}: {e}")
    finally:
        client.close()

# Query 1: June 2026 sales in vet database
run_query(
    "June 2026 sales in coliseu_dashboard_vet",
    """SELECT tenant_id, COUNT(*), SUM(valor_total)
       FROM dash_vendas
       WHERE data_venda >= '2026-06-01' AND data_venda <= '2026-06-30'
       GROUP BY tenant_id"""
)

# Query 2: Sales by status and tenant in vet database
run_query(
    "Sales by status and tenant in coliseu_dashboard_vet",
    "SELECT tenant_id, status, COUNT(*), SUM(valor_total) FROM dash_vendas GROUP BY tenant_id, status"
)

# Query 3: Search for Alice in coliseu_dashboard_vet
run_query(
    "Alice in coliseu_dashboard_vet vendedores",
    "SELECT tenant_id, id_firebird, nome FROM dash_vendedores WHERE nome ILIKE '%ALICE%'"
)

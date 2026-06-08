import paramiko

HOST = '177.39.17.7'
USER = 'root'
PASS = '6EFBC!c0:wzr%Ij'
CONTAINER = 'coliseu-db-thyqkc5gkvp7i1nld555wakz-172547374937'

def run_query(db_name, sql, label):
    sql_escaped = sql.replace('"', '\\"')
    cmd = f'docker exec {CONTAINER} psql -U coliseu_admin -d {db_name} -c "{sql_escaped}"'
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        client.connect(HOST, username=USER, password=PASS)
        _, stdout, stderr = client.exec_command(cmd)
        print(f"\n=== DB: {db_name} | {label} ===")
        print(stdout.read().decode('utf-8'))
    except Exception as e:
        print(f"[ERROR] {label}: {e}")
    finally:
        client.close()

# List tables in coliseu_dashboard_vet
run_query(
    "coliseu_dashboard_vet",
    "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';",
    "Tables list"
)

# List tenant IDs and sales count in coliseu_dashboard_vet if dash_vendas exists
run_query(
    "coliseu_dashboard_vet",
    "SELECT tenant_id, COUNT(*) FROM dash_vendas GROUP BY tenant_id;",
    "Sales count per tenant"
)

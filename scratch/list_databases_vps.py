import paramiko

HOST = '177.39.17.7'
USER = 'root'
PASS = '6EFBC!c0:wzr%Ij'
CONTAINER = 'coliseu-db-thyqkc5gkvp7i1nld555wakz-172547374937'

def run_query(label, sql, db='coliseu_dashboard'):
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

# Query 1: List tables in coliseu_identity
run_query(
    "Tables in coliseu_identity",
    "SELECT tablename FROM pg_tables WHERE schemaname = 'public'",
    db='coliseu_identity'
)

# Query 2: List companies in coliseu_identity.companies
run_query(
    "Companies in coliseu_identity.companies",
    "SELECT id, name, document FROM companies",
    db='coliseu_identity'
)

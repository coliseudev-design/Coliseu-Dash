import paramiko

HOST = '177.39.17.7'
USER = 'root'
PASS = '6EFBC!c0:wzr%Ij'
CONTAINER = 'coliseu-db-thyqkc5gkvp7i1nld555wakz-172547374937'

def run_query(db_name, label, sql):
    sql_escaped = sql.replace('"', '\\"')
    cmd = f'docker exec {CONTAINER} psql -U coliseu_admin -d {db_name} -c "{sql_escaped}"'
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        client.connect(HOST, username=USER, password=PASS)
        _, stdout, stderr = client.exec_command(cmd)
        out = stdout.read().decode('utf-8')
        err = stderr.read().decode('utf-8')
        print(f"\n=== DB: {db_name} - {label} ===")
        print(out or "(sem resultado)")
        if err.strip():
            print("ERR:", err)
    except Exception as e:
        print(f"[ERRO] {db_name} - {label}: {e}")
    finally:
        client.close()

# List schemas in coliseu_dashboard
run_query("coliseu_dashboard", "SCHEMAS", "SELECT schema_name FROM information_schema.schemata;")

# List schemas in coliseu_dashboard_vet
run_query("coliseu_dashboard_vet", "SCHEMAS", "SELECT schema_name FROM information_schema.schemata;")

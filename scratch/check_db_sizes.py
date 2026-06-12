import paramiko

HOST = '177.39.17.7'
USER = 'root'
PASS = '6EFBC!c0:wzr%Ij'
CONTAINER = 'coliseu-db-thyqkc5gkvp7i1nld555wakz-172547374937'

def run_query(db_name, sql):
    cmd = f'docker exec {CONTAINER} psql -U coliseu_admin -d {db_name} -t -c "{sql}"'
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        client.connect(HOST, username=USER, password=PASS)
        _, stdout, stderr = client.exec_command(cmd)
        out = stdout.read().decode('utf-8').strip()
        return out
    except Exception as e:
        return f"ERROR: {e}"
    finally:
        client.close()

# List all tables and count rows for each
for db in ["coliseu_dashboard", "coliseu_dashboard_vet"]:
    print(f"\n================ DB: {db} ================")
    tables_str = run_query(db, "SELECT tablename FROM pg_tables WHERE schemaname = 'public';")
    if "ERROR" in tables_str:
        print(tables_str)
        continue
    tables = [t.strip() for t in tables_str.split('\n') if t.strip()]
    for table in tables:
        count = run_query(db, f"SELECT COUNT(*) FROM {table};")
        print(f"Table: {table.ljust(25)} | Rows: {count}")

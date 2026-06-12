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

# 1. Check database users (roles)
run_query("coliseu_dashboard", "ROLES", "SELECT rolname, rolsuper, rolcreaterole, rolcreatedb, rolbypassrls FROM pg_roles;")

# 2. Check if RLS is enabled on dash_vendas
run_query("coliseu_dashboard", "RLS STATUS", "SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';")

# 3. Query pg_class to see real row count estimate without RLS filtering
run_query("coliseu_dashboard", "PG_CLASS ESTIMATES", "SELECT relname, reltuples FROM pg_class WHERE relname IN ('dash_vendas', 'dash_vendas_itens', 'dash_usuarios');")

# 4. Check if there are other schemas or tables with the same name
run_query("coliseu_dashboard", "ALL SCHEMAS TABLES", "SELECT table_schema, table_name FROM information_schema.tables WHERE table_name = 'dash_vendas';")

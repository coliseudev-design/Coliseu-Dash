import paramiko

HOST = '177.39.17.7'
USER = 'root'
PASS = '6EFBC!c0:wzr%Ij'
CONTAINER = 'coliseu-db-thyqkc5gkvp7i1nld555wakz-172547374937'

def run_query(label, sql, db="coliseu_dashboard"):
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
        if err.strip():
            print("ERR:", err)
    except Exception as e:
        print(f"[ERRO] {label}: {e}")
    finally:
        client.close()

# Let's check for any occurrence of thiago in the database.
# What are the tables in coliseu_identity?
# Let's check device serials or sessions
run_query("SESSIONS IN IDENTITY", 'SELECT * FROM sessions', db="coliseu_identity")
run_query("DEVICES IN IDENTITY", 'SELECT * FROM devices', db="coliseu_identity")
run_query("DASH_USUARIOS ALL ROWS", "SELECT * FROM dash_usuarios", db="coliseu_dashboard")

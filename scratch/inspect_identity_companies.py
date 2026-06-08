import paramiko

HOST = '177.39.17.7'
USER = 'root'
PASS = '6EFBC!c0:wzr%Ij'
CONTAINER = 'coliseu-db-thyqkc5gkvp7i1nld555wakz-172547374937'

def run_query(sql, label):
    sql_escaped = sql.replace('"', '\\"')
    cmd = f'docker exec {CONTAINER} psql -U coliseu_admin -d coliseu_identity -c "{sql_escaped}"'
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        client.connect(HOST, username=USER, password=PASS)
        _, stdout, stderr = client.exec_command(cmd)
        out = stdout.read().decode('utf-8')
        err = stderr.read().decode('utf-8')
        print(f"\n=== {label} ===")
        print(out or "(no result)")
        if err.strip():
            print("ERR:", err)
    except Exception as e:
        print(f"[ERROR]: {e}")
    finally:
        client.close()

run_query('SELECT "Id", "Name" FROM companies;', "All Companies")
run_query('SELECT "Id", "Name", "CompanyId" FROM branches;', "All Branches")

import paramiko

HOST = '177.39.17.7'
USER = 'root'
PASS = '6EFBC!c0:wzr%Ij'
CONTAINER = 'coliseu-db-thyqkc5gkvp7i1nld555wakz-172547374937'

def run_query(db_name, sql):
    cmd = f'docker exec {CONTAINER} psql -U coliseu_admin -d {db_name} -c "{sql}"'
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        client.connect(HOST, username=USER, password=PASS)
        _, stdout, stderr = client.exec_command(cmd)
        out = stdout.read().decode('utf-8').strip()
        print(f"=== DB: {db_name} ===")
        print(out)
    except Exception as e:
        print(f"ERROR: {e}")
    finally:
        client.close()

run_query("coliseu_dashboard", "SELECT * FROM dash_vendas;")

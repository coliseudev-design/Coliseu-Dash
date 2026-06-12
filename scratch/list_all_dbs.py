import paramiko

HOST = '177.39.17.7'
USER = 'root'
PASS = '6EFBC!c0:wzr%Ij'
CONTAINER = 'coliseu-db-thyqkc5gkvp7i1nld555wakz-172547374937'

def run_cmd(db_name, cmd_str):
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        client.connect(HOST, username=USER, password=PASS)
        exec_cmd = f"docker exec {CONTAINER} psql -U coliseu_admin -d {db_name} -c \"{cmd_str}\""
        _, stdout, stderr = client.exec_command(exec_cmd)
        out = stdout.read().decode('utf-8')
        err = stderr.read().decode('utf-8')
        print(f"=== DB: {db_name} - CMD: {cmd_str} ===")
        print(out)
        if err.strip():
            print("ERR:", err)
    except Exception as e:
        print(f"ERRO: {e}")
    finally:
        client.close()

# List tables in coliseu_dashboard
run_cmd("coliseu_dashboard", "\\dt")

# List tables in coliseu_dashboard_vet
run_cmd("coliseu_dashboard_vet", "\\dt")

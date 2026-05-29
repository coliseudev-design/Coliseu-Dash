import paramiko

HOST = '177.39.17.7'
USER = 'root'
PASS = '6EFBC!c0:wzr%Ij'

def run_cmd(label, cmd):
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

# List active docker containers
run_cmd("DOCKER PS", "docker ps")

# View environment variables for coliseu-mw or coliseu container
run_cmd("INSPECT MIDDLEWARE CONTAINER", "docker inspect coliseu-mw-thyqkc5gkvp7i1nld555wakz-172547374937 | grep -i -E 'PG_HOST|PG_DATABASE'")

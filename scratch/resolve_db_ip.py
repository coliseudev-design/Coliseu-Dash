import paramiko

HOST = '177.39.17.7'
USER = 'root'
PASS = '6EFBC!c0:wzr%Ij'
CONTAINER = 'dashboard-middleware-irerzifjwjb4q8ucbpfk2gb8-010649342983'

def run_cmd(cmd, label):
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        client.connect(HOST, username=USER, password=PASS)
        _, stdout, stderr = client.exec_command(cmd)
        print(f"\n=== {label} ===")
        print(stdout.read().decode('utf-8'))
    except Exception as e:
        print(f"[ERROR]: {e}")
    finally:
        client.close()

run_cmd(f"docker exec {CONTAINER} node -e \"require('dns').lookup('coliseu-db', (err, addr) => console.log('ADDR:', addr))\"", "Resolve coliseu-db IP")
run_cmd(f"docker inspect coliseu-db-thyqkc5gkvp7i1nld555wakz-172547374937 --format '{{{{.NetworkSettings.Networks}}}}'", "Inspect DB networks")
run_cmd(f"docker inspect {CONTAINER} --format '{{{{.NetworkSettings.Networks}}}}'", "Inspect Middleware networks")

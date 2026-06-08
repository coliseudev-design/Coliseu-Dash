import paramiko

HOST = '177.39.17.7'
USER = 'root'
PASS = '6EFBC!c0:wzr%Ij'

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

run_cmd("cat /data/coolify/applications/irerzifjwjb4q8ucbpfk2gb8/.env", "App env file")
run_cmd("cat /artifacts/rc82x53lzbjrbqj6mbkvzwa3/.env", "Artifact env file")

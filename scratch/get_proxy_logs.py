import paramiko

HOST = '177.39.17.7'
USER = 'root'
PASS = '6EFBC!c0:wzr%Ij'
CONTAINER = 'coolify-proxy'

def run_cmd(cmd, label):
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        client.connect(HOST, username=USER, password=PASS)
        _, stdout, stderr = client.exec_command(cmd)
        print(f"\n=== {label} ===")
        print(stdout.read().decode('utf-8'))
        if stderr.read().decode('utf-8').strip():
            print("STDERR:", stderr.read().decode('utf-8'))
    except Exception as e:
        print(f"[ERROR]: {e}")
    finally:
        client.close()

run_cmd(f"docker logs --tail 100 {CONTAINER}", "coolify-proxy logs")

import paramiko

HOST = '177.39.17.7'
USER = 'root'
PASS = '6EFBC!c0:wzr%Ij'
CONTAINER = 'dashboard-frontend-irerzifjwjb4q8ucbpfk2gb8-010649336876'

def run_cmd(cmd, label):
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        client.connect(HOST, username=USER, password=PASS)
        _, stdout, stderr = client.exec_command(cmd)
        out = stdout.read().decode('utf-8')
        err = stderr.read().decode('utf-8')
        print(f"\n=== {label} ===")
        print(out or "(no stdout)")
        if err.strip():
            print("ERR:", err)
    except Exception as e:
        print(f"[ERROR]: {e}")
    finally:
        client.close()

run_cmd(f"docker exec {CONTAINER} cat /etc/nginx/nginx.conf", "nginx.conf")
run_cmd(f"docker exec {CONTAINER} cat /etc/nginx/conf.d/nginx.conf", "nginx.conf in conf.d")
run_cmd(f"docker exec {CONTAINER} ls -la /etc/nginx/conf.d/", "list conf.d")

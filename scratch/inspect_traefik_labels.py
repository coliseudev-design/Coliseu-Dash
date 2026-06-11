import paramiko
import json

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
try:
    client.connect('2.24.82.19', username='root', password='Col@13894645', timeout=10)
    print("Connected to VPS")
except Exception as e:
    print("Failed to connect:", e)
    exit(1)

def run_cmd(cmd):
    print(f"\n--- Running: {cmd} ---")
    stdin, stdout, stderr = client.exec_command(cmd)
    out = stdout.read().decode('utf-8')
    err = stderr.read().decode('utf-8')
    if out:
        print("STDOUT:")
        print(out)
    if err:
        print("STDERR:")
        print(err)
    return out

frontend = "dashboard-frontend-g115wwb76cltjli9wew0cgfi-131915489999"
middleware = "dashboard-middleware-g115wwb76cltjli9wew0cgfi-131915494166"

print("\n=== Frontend Labels ===")
run_cmd(f"docker inspect {frontend} --format '{{{{json .Config.Labels}}}}'")

print("\n=== Middleware Labels ===")
run_cmd(f"docker inspect {middleware} --format '{{{{json .Config.Labels}}}}'")

client.close()

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

frontend_name = "dashboard-frontend-g115wwb76cltjli9wew0cgfi-131915489999"
middleware_name = "dashboard-middleware-g115wwb76cltjli9wew0cgfi-131915494166"

print("\n=== FRONTEND ENV ===")
run_cmd(f"docker inspect {frontend_name} --format '{{{{json .Config.Env}}}}'")

print("\n=== MIDDLEWARE ENV ===")
run_cmd(f"docker inspect {middleware_name} --format '{{{{json .Config.Env}}}}'")

print("\n=== FRONTEND NGINX CONFIG ===")
run_cmd(f"docker exec {frontend_name} cat /etc/nginx/nginx.conf")
run_cmd(f"docker exec {frontend_name} ls -la /etc/nginx/conf.d")
run_cmd(f"docker exec {frontend_name} cat /etc/nginx/conf.d/default.conf")

client.close()

import paramiko

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

frontend = "dashboard-frontend-g115wwb76cltjli9wew0cgfi-185241878935"
middleware = "dashboard-middleware-g115wwb76cltjli9wew0cgfi-185241882640"

print("\n=== FRONTEND NGINX ACCESS LOGS ===")
run_cmd(f"docker exec {frontend} tail -n 30 /var/log/nginx/access.log")

print("\n=== FRONTEND NGINX ERROR LOGS ===")
run_cmd(f"docker exec {frontend} tail -n 30 /var/log/nginx/error.log")

print("\n=== MIDDLEWARE API LOGS ===")
run_cmd(f"docker logs --tail 50 {middleware}")

client.close()

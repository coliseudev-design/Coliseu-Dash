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
    return out

# Get container names dynamically
stdin, stdout, stderr = client.exec_command("docker ps --format '{{.Names}}'")
all_names = stdout.read().decode('utf-8').strip().split('\n')

frontend_container = None
middleware_container = None

for name in all_names:
    if "dashboard-frontend" in name:
        frontend_container = name
    elif "dashboard-middleware" in name:
        middleware_container = name

print(f"Active frontend container: {frontend_container}")
print(f"Active middleware container: {middleware_container}")

if frontend_container:
    # Cat Nginx error log
    run_cmd(f"docker exec {frontend_container} cat /var/log/nginx/error.log")
    # Tail access log
    run_cmd(f"docker exec {frontend_container} tail -n 30 /var/log/nginx/access.log")
else:
    print("Frontend container not found!")

if middleware_container:
    # Tail middleware logs
    run_cmd(f"docker logs --tail 30 {middleware_container}")

client.close()

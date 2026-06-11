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

# Dynamic container discovery
stdin, stdout, stderr = client.exec_command("docker ps --format '{{.Names}}' | grep 'g115wwb76cltjli9wew0cgfi'")
names = stdout.read().decode('utf-8').strip().split('\n')

frontend = None
middleware = None

for name in names:
    name = name.strip()
    if not name:
        continue
    if "frontend" in name:
        frontend = name
    elif "middleware" in name:
        middleware = name

print(f"Discovered active frontend: {frontend}")
print(f"Discovered active middleware: {middleware}")

if frontend:
    run_cmd(f"docker exec {frontend} tail -n 50 /var/log/nginx/access.log")
    run_cmd(f"docker exec {frontend} tail -n 50 /var/log/nginx/error.log")
else:
    print("No active frontend container found.")

if middleware:
    run_cmd(f"docker logs --tail 100 {middleware}")
else:
    print("No active middleware container found.")

client.close()

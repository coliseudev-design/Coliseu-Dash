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
stdin, stdout, stderr = client.exec_command("docker ps --format '{{.Names}}' | grep 'dashboard-middleware-g115wwb76cltjli9wew0cgfi'")
names = stdout.read().decode('utf-8').strip().split('\n')
middleware = names[0].strip() if names and names[0].strip() else None

print(f"Middleware container: {middleware}")

if middleware:
    run_cmd(f"docker logs --tail 100 {middleware}")
else:
    print("No active middleware container found.")

client.close()

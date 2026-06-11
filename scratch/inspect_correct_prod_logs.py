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

# Get active container names for resource g115wwb76cltjli9wew0cgfi
stdin, stdout, stderr = client.exec_command("docker ps --format '{{.Names}}' | grep 'g115wwb76cltjli9wew0cgfi'")
names = stdout.read().decode('utf-8').strip().split('\n')

frontend_container = None
middleware_container = None

for name in names:
    if "frontend" in name:
        frontend_container = name
    elif "middleware" in name:
        middleware_container = name

print(f"Active production frontend container: {frontend_container}")
print(f"Active production middleware container: {middleware_container}")

if frontend_container:
    # Print the last 40 lines of access logs
    run_cmd(f"docker exec {frontend_container} tail -n 40 /var/log/nginx/access.log")
    # Print the last 40 lines of error logs
    run_cmd(f"docker exec {frontend_container} tail -n 40 /var/log/nginx/error.log")

if middleware_container:
    # Print the last 60 lines of middleware logs
    run_cmd(f"docker logs --tail 60 {middleware_container}")

client.close()

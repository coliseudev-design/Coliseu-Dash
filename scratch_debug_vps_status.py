import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('2.24.82.19', username='root', password='Col@13894645', timeout=10)

def run_cmd(cmd):
    stdin, stdout, stderr = client.exec_command(cmd)
    out = stdout.read().decode('utf-8')
    err = stderr.read().decode('utf-8')
    return out, err

print("=== ACTIVE DOCKER CONTAINERS ===")
out, err = run_cmd("docker ps")
print(out)
if err: print("ERR:", err)

# Find middleware container name
stdin, stdout, stderr = client.exec_command("docker ps --format '{{.Names}}' | grep 'dashboard-middleware'")
container_name = stdout.read().decode('utf-8').strip().split('\n')[0]
print(f"\nMiddleware Container Name: {container_name}")

if container_name:
    print("\n=== MIDDLEWARE CONTAINER STATUS ===")
    out, err = run_cmd(f"docker inspect {container_name} --format '{{{{.State.Status}}}} | Healthy: {{{{json .State.Health.Status}}}}'")
    print(out)
    
    print("\n=== MIDDLEWARE HEALTHCHECK CONFIG ===")
    out, err = run_cmd(f"docker inspect {container_name} --format '{{{{json .Config.Healthcheck}}}}'")
    print(out)
    
    print("\n=== MIDDLEWARE HEALTHCHECK LOGS ===")
    out, err = run_cmd(f"docker inspect {container_name} --format '{{{{json .State.Health}}}}'")
    print(out)
    
    print("\n=== RECENT MIDDLEWARE LOGS (LAST 150 LINES) ===")
    out, err = run_cmd(f"docker logs --tail 150 {container_name}")
    print(out)
    if err: print("STDERR LOGS:\n", err)
else:
    print("Middleware container not found running!")

client.close()

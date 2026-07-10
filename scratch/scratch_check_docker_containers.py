import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('2.24.82.19', username='root', password='Col@13894645')

def run_cmd(cmd):
    stdin, stdout, stderr = client.exec_command(cmd)
    return stdout.read().decode('utf-8') + stderr.read().decode('utf-8')

print("=== RUNNING CONTAINERS ===")
print(run_cmd("docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'"))

print("=== LATEST LOGS OF MIDDLEWARE CONTAINER ===")
# Let's search for container name with 'middleware' or similar
containers = run_cmd("docker ps --format '{{.Names}}'").strip().split('\n')
mw_container = None
for c in containers:
    if 'middleware' in c or 'dash' in c or 'coliseu' in c:
        # Let's print logs for each candidate
        print(f"--- LOGS FOR {c} ---")
        print(run_cmd(f"docker logs --tail 30 {c}"))

client.close()

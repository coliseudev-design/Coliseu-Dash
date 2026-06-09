import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('2.24.82.19', username='root', password='Col@13894645', timeout=10)

def run_cmd(cmd):
    stdin, stdout, stderr = client.exec_command(cmd)
    out = stdout.read().decode('utf-8')
    err = stderr.read().decode('utf-8')
    print(f"=== {cmd} ===")
    if out:
        print(out)
    if err:
        print("ERR:", err)

# List all containers
run_cmd("docker ps -a --format '{{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}'")

# Inspect Docker networks
run_cmd("docker network ls")

# Inspect coolify network
run_cmd("docker network inspect coolify | python3 -c \"import json,sys; n=json.load(sys.stdin); [(print(c['Name'],c.get('IPv4Address'),c.get('Aliases','')) ) for c in n[0]['Containers'].values()]\" 2>/dev/null || docker network inspect coolify")

client.close()

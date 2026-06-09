import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('2.24.82.19', username='root', password='Col@13894645', timeout=10)

# Find container name dynamically
stdin, stdout, stderr = client.exec_command("docker ps --format '{{.Names}}' | grep 'dashboard-middleware'")
container_name = stdout.read().decode('utf-8').strip().split('\n')[0]

if container_name:
    print(f"Container: {container_name}")
    # Inspect sync.js around line 150
    cmd = f"docker exec {container_name} sed -n '140,160p' /usr/src/app/src/routes/sync.js"
    stdin, stdout, stderr = client.exec_command(cmd)
    print("=== File Content on VPS Container ===")
    print(stdout.read().decode('utf-8'))
else:
    print("Container not found!")

client.close()

import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('2.24.82.19', username='root', password='Col@13894645')

# Discover container name
stdin, stdout, stderr = client.exec_command("docker ps --format '{{.Names}}' | grep 'dashboard-middleware'")
container_names = stdout.read().decode('utf-8').strip().split('\n')
container_name = container_names[0] if container_names[0] else None

if container_name:
    print(f"Container: {container_name}")
    stdin, stdout, stderr = client.exec_command(f"docker logs --tail 200 {container_name}")
    print(stdout.read().decode('utf-8'))
else:
    print("No container found!")

client.close()

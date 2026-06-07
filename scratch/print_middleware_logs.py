import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('177.39.17.7', username='root', password='6EFBC!c0:wzr%Ij')

# Get container ID dynamically
stdin, stdout, stderr = client.exec_command("docker ps -q --filter name=dashboard-middleware | head -n 1")
container_id = stdout.read().decode('utf-8').strip()

print(f"Container ID: {container_id}")
if container_id:
    # Print last 100 log lines
    stdin, stdout, stderr = client.exec_command(f"docker logs --tail 100 {container_id}")
    print("=== MIDDLEWARE LOGS ===")
    print(stdout.read().decode('utf-8'))
    print(stderr.read().decode('utf-8'))
else:
    print("Container not found.")

client.close()

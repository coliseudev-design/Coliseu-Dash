import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('177.39.17.7', username='root', password='6EFBC!c0:wzr%Ij')

stdin, stdout, stderr = client.exec_command("docker ps --filter 'name=dashboard-middleware' --format '{{.Names}}'")
container_name = stdout.read().decode('utf-8').strip()

print(f"Container Name: {container_name}")

if container_name:
    stdin, stdout, stderr = client.exec_command(f"docker logs --tail 100 {container_name}")
    print("=== CONTAINER LOGS ===")
    print(stdout.read().decode('utf-8'))
    print("=== CONTAINER ERRORS ===")
    print(stderr.read().decode('utf-8'))
else:
    print("Container not found")

client.close()

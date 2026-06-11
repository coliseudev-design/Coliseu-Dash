import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('177.39.17.7', username='root', password='6EFBC!c0:wzr%Ij')

# Find the middleware container dynamically
stdin, stdout, stderr = client.exec_command('docker ps --format "{{.Names}}" | grep dashboard-middleware')
container_name = stdout.read().decode('utf-8').strip()

print(f"Container name: {container_name}")

if container_name:
    stdin, stdout, stderr = client.exec_command(f'docker logs --tail 100 {container_name}')
    print("=== Middleware Logs ===")
    print(stdout.read().decode('utf-8'))
    print("=== Error (if any) ===")
    print(stderr.read().decode('utf-8'))
else:
    print("No dashboard-middleware container found.")

client.close()

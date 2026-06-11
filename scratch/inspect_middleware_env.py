import paramiko
import json

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('177.39.17.7', username='root', password='6EFBC!c0:wzr%Ij')

# Find the middleware container dynamically
stdin, stdout, stderr = client.exec_command('docker ps --format "{{.Names}}" | grep dashboard-middleware')
container_name = stdout.read().decode('utf-8').strip()

print(f"Container name: {container_name}")

if container_name:
    stdin, stdout, stderr = client.exec_command(f'docker inspect {container_name}')
    data = json.loads(stdout.read().decode('utf-8'))
    env = data[0]['Config']['Env']
    print("=== Container Env Vars ===")
    for item in env:
        # Don't print secrets unless needed, but host/port/database is safe
        if "PASS" not in item and "SECRET" not in item and "KEY" not in item:
            print(item)
else:
    print("No dashboard-middleware container found.")

client.close()

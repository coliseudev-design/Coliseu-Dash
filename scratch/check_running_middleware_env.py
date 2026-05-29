import paramiko
import json

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('177.39.17.7', username='root', password='6EFBC!c0:wzr%Ij')

stdin, stdout, stderr = client.exec_command("docker ps --filter 'name=dashboard-middleware' --format '{{.Names}}'")
container_name = stdout.read().decode('utf-8').strip()

if container_name:
    stdin, stdout, stderr = client.exec_command(f"docker inspect {container_name}")
    info = json.loads(stdout.read().decode('utf-8'))
    env_vars = info[0]['Config']['Env']
    print("=== ALL ENV VARS ===")
    for var in env_vars:
        print(var)
else:
    print("Container not found")

client.close()

import paramiko
import json

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('177.39.17.7', username='root', password='6EFBC!c0:wzr%Ij')

stdin, stdout, stderr = client.exec_command("docker ps -q --filter name=dashboard-middleware | head -n 1")
container_id = stdout.read().decode('utf-8').strip()

print(f"Container ID: {container_id}")
if container_id:
    stdin, stdout, stderr = client.exec_command(f"docker inspect {container_id} --format '{{{{json .Config.Env}}}}'")
    env_json = stdout.read().decode('utf-8')
    try:
        envs = json.loads(env_json)
        print("=== Environment Variables ===")
        for env in sorted(envs):
            print(env)
    except Exception as e:
        print("Error parsing JSON:", e)
        print(env_json)
else:
    print("Container not found.")

client.close()

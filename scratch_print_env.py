import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('177.39.17.7', username='root', password='6EFBC!c0:wzr%Ij')

stdin, stdout, stderr = client.exec_command("docker ps --format '{{.Names}}' | grep 'dashboard-middleware'")
MW = stdout.read().decode('utf-8').strip()
print(f"Middleware container: {MW}")

stdin, stdout, stderr = client.exec_command(f"docker inspect {MW} --format '{{{{json .Config.Env}}}}'")
env_json = stdout.read().decode('utf-8').strip()
import json
envs = json.loads(env_json)
for env in envs:
    if "PG_" in env or "VET" in env:
        print(env)

client.close()

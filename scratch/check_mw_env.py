import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('177.39.17.7', username='root', password='6EFBC!c0:wzr%Ij')

# Check env file in coolify deploy directory or docker inspect
cmd = 'docker inspect dashboard-middleware-irerzifjwjb4q8ucbpfk2gb8-203733456093'
stdin, stdout, stderr = client.exec_command(cmd)
import json
info = json.loads(stdout.read().decode('utf-8'))
if info:
    envs = info[0].get('Config', {}).get('Env', [])
    for e in envs:
        if "INTERNAL_API_KEY" in e or "EXPECTED_MODULE_SLUG" in e:
            print(e)
else:
    print("No info")
client.close()

import paramiko
import json

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('177.39.17.7', username='root', password='6EFBC!c0:wzr%Ij')

cmd = 'docker inspect dashboard-middleware-irerzifjwjb4q8ucbpfk2gb8-203733456093'
stdin, stdout, stderr = client.exec_command(cmd)
info = json.loads(stdout.read().decode('utf-8'))
if info:
    envs = info[0].get('Config', {}).get('Env', [])
    print("ENV VARS:")
    for e in envs:
        print(e)
else:
    print("No info")
client.close()

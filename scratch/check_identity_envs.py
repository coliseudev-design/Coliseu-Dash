import paramiko
import json

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('177.39.17.7', username='root', password='6EFBC!c0:wzr%Ij')

cmd = 'docker inspect api-nsnopymisrq9qphl5qjc3w5l-135847967979'
stdin, stdout, stderr = client.exec_command(cmd)
info = json.loads(stdout.read().decode('utf-8'))
if info:
    envs = info[0].get('Config', {}).get('Env', [])
    print("ENV VARS:")
    for e in envs:
        # Hide sensitive passwords if any, but print database hosts/connections
        if "Password" in e or "Key" in e or "Secret" in e:
            name = e.split('=')[0]
            print(f"{name}=********")
        else:
            print(e)
else:
    print("No container info found")
client.close()

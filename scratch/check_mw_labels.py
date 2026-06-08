import paramiko
import json

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('177.39.17.7', username='root', password='6EFBC!c0:wzr%Ij')

cmd = 'docker inspect dashboard-frontend-irerzifjwjb4q8ucbpfk2gb8-203733450477'
stdin, stdout, stderr = client.exec_command(cmd)
info = json.loads(stdout.read().decode('utf-8'))
if info:
    labels = info[0].get('Config', {}).get('Labels', {})
    print("LABELS:")
    for k, v in labels.items():
        if "traefik" in k:
            print(f"{k}={v}")
else:
    print("No info")
client.close()

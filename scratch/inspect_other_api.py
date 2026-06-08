import paramiko, json

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('177.39.17.7', username='root', password='6EFBC!c0:wzr%Ij')

cmd = "docker inspect api-nsnopymisrq9qphl5qjc3w5l-135847967979"
stdin, stdout, stderr = client.exec_command(cmd)
print("INSPECT:")
data = json.loads(stdout.read().decode('utf-8'))
print(json.dumps(data[0]['Config']['Env'], indent=2))
print(json.dumps(data[0]['Config']['Labels'], indent=2))
client.close()

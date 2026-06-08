import paramiko, json

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('177.39.17.7', username='root', password='6EFBC!c0:wzr%Ij')

cmd = "docker inspect coliseu-db-thyqkc5gkvp7i1nld555wakz-172547374937"
stdin, stdout, stderr = client.exec_command(cmd)
data = json.loads(stdout.read().decode('utf-8'))
print("DB Port Bindings:")
print(json.dumps(data[0]['NetworkSettings']['Ports'], indent=2))
print("DB Env:")
print(json.dumps(data[0]['Config']['Env'], indent=2))
client.close()

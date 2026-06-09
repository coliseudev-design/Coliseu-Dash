import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('177.39.17.7', username='root', password='6EFBC!c0:wzr%Ij')

stdin, stdout, stderr = client.exec_command("cat /data/coolify/applications/thyqkc5gkvp7i1nld555wakz/docker-compose.yaml")
print(stdout.read().decode('utf-8'))

client.close()

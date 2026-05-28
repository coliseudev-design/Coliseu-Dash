import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('177.39.17.7', username='root', password='6EFBC!c0:wzr%Ij')

stdin, stdout, stderr = client.exec_command("cat /data/coolify/applications/irerzifjwjb4q8ucbpfk2gb8/.env | grep INTERNAL_API_KEY")
print("INTERNAL_API_KEY on VPS:")
print(stdout.read().decode('utf-8').strip())

client.close()

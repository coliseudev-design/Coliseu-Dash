import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('177.39.17.7', username='root', password='6EFBC!c0:wzr%Ij')

stdin, stdout, stderr = client.exec_command("docker ps --format 'table {{.Names}}\t{{.Image}}\t{{.Status}}'")
print("=== DOCKER PS ON 177.39.17.7 ===")
print(stdout.read().decode('utf-8'))

client.close()

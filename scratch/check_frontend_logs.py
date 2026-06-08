import paramiko
client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('177.39.17.7', username='root', password='6EFBC!c0:wzr%Ij')

cmd = 'docker logs --tail 30 dashboard-frontend-irerzifjwjb4q8ucbpfk2gb8-203733450477'
stdin, stdout, stderr = client.exec_command(cmd)
print("STDOUT:")
print(stdout.read().decode('utf-8'))
print("STDERR:")
print(stderr.read().decode('utf-8'))
client.close()

import paramiko
client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('177.39.17.7', username='root', password='6EFBC!c0:wzr%Ij')

cmd = 'docker exec dashboard-middleware-irerzifjwjb4q8ucbpfk2gb8-203733456093 cat /usr/src/app/src/middleware/auth.js | grep -A 10 "Bypass licensing"'
stdin, stdout, stderr = client.exec_command(cmd)
print("STDOUT:")
print(stdout.read().decode('utf-8'))
client.close()

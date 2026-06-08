import paramiko
client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('177.39.17.7', username='root', password='6EFBC!c0:wzr%Ij')

cmd = 'docker exec dashboard-frontend-irerzifjwjb4q8ucbpfk2gb8-203733450477 cat /etc/nginx/conf.d/default.conf'
stdin, stdout, stderr = client.exec_command(cmd)
print("=== default.conf ===")
print(stdout.read().decode('utf-8'))

cmd2 = 'docker exec dashboard-frontend-irerzifjwjb4q8ucbpfk2gb8-203733450477 cat /etc/nginx/nginx.conf'
stdin2, stdout2, stderr2 = client.exec_command(cmd2)
print("=== nginx.conf ===")
print(stdout2.read().decode('utf-8'))

client.close()

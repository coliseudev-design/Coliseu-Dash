import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('177.39.17.7', username='root', password='6EFBC!c0:wzr%Ij')

MW = "dashboard-middleware-irerzifjwjb4q8ucbpfk2gb8-183851948696"

stdin, stdout, stderr = client.exec_command(f'docker logs --tail 100 {MW}')
print("=== Middleware Logs ===")
print(stdout.read().decode('utf-8'))
print("=== Error (if any) ===")
print(stderr.read().decode('utf-8'))

client.close()

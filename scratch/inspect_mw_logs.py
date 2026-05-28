import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('177.39.17.7', username='root', password='6EFBC!c0:wzr%Ij')

# Busca os ultimos 100 logs do middleware
cmd = "docker logs --tail 100 dashboard-middleware-irerzifjwjb4q8ucbpfk2gb8-000305782386"
stdin, stdout, stderr = client.exec_command(cmd)
print("=== Middleware logs ===")
print(stdout.read().decode('utf-8'))
print(stderr.read().decode('utf-8'))

client.close()

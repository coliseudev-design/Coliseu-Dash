import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('177.39.17.7', username='root', password='6EFBC!c0:wzr%Ij')

# Find MW container name
stdin, stdout, stderr = client.exec_command("docker ps --format '{{.Names}}' | grep 'dashboard-middleware'")
mw = stdout.read().decode('utf-8').strip()
print(f"Active middleware container: {mw}")

# Busca os ultimos 200 logs do middleware
cmd = f"docker logs --tail 200 {mw}"
stdin, stdout, stderr = client.exec_command(cmd)
print("=== Middleware logs ===")
print(stdout.read().decode('utf-8'))
print(stderr.read().decode('utf-8'))

client.close()

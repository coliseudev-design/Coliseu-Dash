import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('177.39.17.7', username='root', password='6EFBC!c0:wzr%Ij')

# Find the middleware container and get its logs
stdin, stdout, stderr = client.exec_command("docker ps --format '{{.Names}}' | grep 'dashboard-middleware'")
MW = stdout.read().decode('utf-8').strip()
print(f"Container middleware: {MW}")

script = f"docker logs {MW} --tail 200"
stdin, stdout, stderr = client.exec_command(script)
print("=== MIDDLEWARE LOGS (STDOUT) ===")
print(stdout.read().decode('utf-8'))
print("=== MIDDLEWARE LOGS (STDERR) ===")
print(stderr.read().decode('utf-8'))

client.close()

import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('2.24.82.19', username='root', password='Col@13894645', timeout=10)

# Get logs of dashboard-middleware dynamically
cmd = "docker logs $(docker ps --format '{{.Names}}' | grep dashboard-middleware | head -n 1) --tail 100"
stdin, stdout, stderr = client.exec_command(cmd)
print("=== Dashboard Middleware Logs ===")
print(stdout.read().decode('utf-8'))
err = stderr.read().decode('utf-8')
if err:
    print("ERR:", err)

client.close()

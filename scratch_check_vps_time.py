import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('2.24.82.19', username='root', password='Col@13894645', timeout=10)

# Run date command on production VPS
stdin, stdout, stderr = client.exec_command("date; date -u")
print("=== VPS Time (Local / UTC) ===")
print(stdout.read().decode('utf-8'))

# Get the container name of dashboard-middleware
stdin, stdout, stderr = client.exec_command("docker ps --format '{{.Names}}' | grep dashboard-middleware")
container_name = stdout.read().decode('utf-8').strip()
print("Dashboard Middleware Container name:", container_name)

client.close()

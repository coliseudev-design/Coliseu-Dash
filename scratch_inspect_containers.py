import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('177.39.17.7', username='root', password='6EFBC!c0:wzr%Ij')

# List containers and their image names/ports
cmd = "docker ps -a --format 'table {{.ID}}\\t{{.Names}}\\t{{.Image}}\\t{{.Ports}}\\t{{.Status}}'"
stdin, stdout, stderr = client.exec_command(cmd)
print("=== Docker Containers Info ===")
print(stdout.read().decode('utf-8'))

client.close()

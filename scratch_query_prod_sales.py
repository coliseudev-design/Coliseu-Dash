import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('2.24.82.19', username='root', password='Col@13894645', timeout=10)

# List all containers on production VPS
stdin, stdout, stderr = client.exec_command("docker ps -a --format '{{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}'")
print("=== Containers on Production VPS ===")
print(stdout.read().decode('utf-8'))
client.close()
import sys; sys.exit(0)

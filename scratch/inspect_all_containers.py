import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
try:
    client.connect('2.24.82.19', username='root', password='Col@13894645', timeout=10)
    print("Connected to VPS 2.24.82.19")
except Exception as e:
    print("Failed to connect:", e)
    exit(1)

stdin, stdout, stderr = client.exec_command("docker ps -a --format '{{.ID}} | {{.Names}} | {{.Image}} | {{.Ports}} | {{.Status}}'")
containers = stdout.read().decode('utf-8').strip().split('\n')
print("\n=== ALL CONTAINERS ===")
for c in containers:
    print(c)

client.close()

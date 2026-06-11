import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
try:
    client.connect('2.24.82.19', username='root', password='Col@13894645', timeout=10)
    print("Connected to VPS")
except Exception as e:
    print("Failed to connect:", e)
    exit(1)

stdin, stdout, stderr = client.exec_command("docker exec dashboard-frontend-g115wwb76cltjli9wew0cgfi-131915489999 cat /etc/nginx/conf.d/nginx.conf")
print(stdout.read().decode('utf-8'))
print(stderr.read().decode('utf-8'))

client.close()

import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('177.39.17.7', username='root', password='6EFBC!c0:wzr%Ij')

# Get middleware container name dynamically and print its last 150 log lines
cmd = "docker logs $(docker ps -q --filter name=middleware | head -1) --tail 150 2>&1"
stdin, stdout, stderr = client.exec_command(cmd)
print("=== Middleware Logs ===")
print(stdout.read().decode('utf-8'))

client.close()

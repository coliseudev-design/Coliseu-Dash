import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('177.39.17.7', username='root', password='6EFBC!c0:wzr%Ij')

cmd = "sshpass -p '6EFBC!c0:wzr%Ij' ssh -o StrictHostKeyChecking=no root@38.242.244.84 \"docker ps --format '{{.Names}}'\""
stdin, stdout, stderr = client.exec_command(cmd)

print("=== Production Containers ===")
print(stdout.read().decode('utf-8'))
print("=== Errors ===")
print(stderr.read().decode('utf-8'))

client.close()

import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('177.39.17.7', username='root', password='6EFBC!c0:wzr%Ij')

stdin, stdout, stderr = client.exec_command("nc -zv -w 3 2.24.82.19 5432 2>&1")
print("=== NC PORT 5432 ===")
print(stdout.read().decode('utf-8'))

stdin, stdout, stderr = client.exec_command("ping -c 3 2.24.82.19 2>&1")
print("=== PING ===")
print(stdout.read().decode('utf-8'))

client.close()

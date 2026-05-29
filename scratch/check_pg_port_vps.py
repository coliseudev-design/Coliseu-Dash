import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('177.39.17.7', username='root', password='6EFBC!c0:wzr%Ij')

stdin, stdout, stderr = client.exec_command("ss -tulpn | grep 5432")
print("=== VPS PORT 5432 STATUS ===")
print(stdout.read().decode('utf-8'))
client.close()

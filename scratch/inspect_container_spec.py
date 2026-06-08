import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('177.39.17.7', username='root', password='6EFBC!c0:wzr%Ij')

container = "api-nsnopymisrq9qphl5qjc3w5l-135847967979"
stdin, stdout, stderr = client.exec_command(f"docker inspect {container}")
print(stdout.read().decode('utf-8'))

client.close()

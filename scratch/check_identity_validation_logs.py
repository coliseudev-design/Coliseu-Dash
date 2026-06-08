import paramiko
client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('177.39.17.7', username='root', password='6EFBC!c0:wzr%Ij')

cmd = 'docker logs --tail 200 api-nsnopymisrq9qphl5qjc3w5l-135847967979 2>&1'
stdin, stdout, stderr = client.exec_command(cmd)
print("STDOUT:")
print(stdout.read().decode('utf-8'))
client.close()

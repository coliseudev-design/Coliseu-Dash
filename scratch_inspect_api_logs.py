import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('177.39.17.7', username='root', password='6EFBC!c0:wzr%Ij')

cmd = "docker logs api-nsnopymisrq9qphl5qjc3w5l-042333644905 --tail 100 2>&1"
stdin, stdout, stderr = client.exec_command(cmd)
print("=== api container logs ===")
print(stdout.read().decode('utf-8'))

client.close()

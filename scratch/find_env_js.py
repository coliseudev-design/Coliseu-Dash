import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('177.39.17.7', username='root', password='6EFBC!c0:wzr%Ij')

container = "dashboard-middleware-irerzifjwjb4q8ucbpfk2gb8-213853066504"

print("=== FINDING env.js IN CONTAINER ===")
stdin, stdout, stderr = client.exec_command(f"docker exec {container} find / -name 'env.js'")
print("STDOUT:", stdout.read().decode('utf-8'))
print("STDERR:", stderr.read().decode('utf-8'))

client.close()

import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('177.39.17.7', username='root', password='6EFBC!c0:wzr%Ij')

cmd = "docker inspect --format='{{range .Config.Env}}{{println .}}{{end}}' dashboard-frontend-irerzifjwjb4q8ucbpfk2gb8-202239291233"
stdin, stdout, stderr = client.exec_command(cmd)
print("=== Frontend Env Values ===")
for line in stdout.read().decode('utf-8').splitlines():
    print(f"  {line}")

client.close()

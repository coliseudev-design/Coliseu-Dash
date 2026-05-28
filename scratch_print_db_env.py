import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('177.39.17.7', username='root', password='6EFBC!c0:wzr%Ij')

cmd = "docker inspect --format='{{range .Config.Env}}{{println .}}{{end}}' api-nsnopymisrq9qphl5qjc3w5l-123757509887"
stdin, stdout, stderr = client.exec_command(cmd)
print("=== Identity API Env Values ===")
for line in stdout.read().decode('utf-8').splitlines():
    if '=' in line:
        print(f"  {line}")

client.close()

import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('177.39.17.7', username='root', password='6EFBC!c0:wzr%Ij')

stdin, stdout, stderr = client.exec_command("cat /data/coolify/applications/irerzifjwjb4q8ucbpfk2gb8/.env")
print("=== Content of .env ===")
for line in stdout.read().decode('utf-8').split('\n'):
    if '=' in line:
        k, v = line.split('=', 1)
        if any(sec in k.upper() for sec in ['PASSWORD', 'SECRET', 'KEY', 'JWT', 'TOKEN', 'PASS']):
            print(f"{k}=******")
        else:
            print(f"{k}={v}")
    else:
        print(line)

client.close()

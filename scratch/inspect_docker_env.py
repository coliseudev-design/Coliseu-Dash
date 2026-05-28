import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('177.39.17.7', username='root', password='6EFBC!c0:wzr%Ij')

stdin, stdout, stderr = client.exec_command('docker exec dashboard-middleware-irerzifjwjb4q8ucbpfk2gb8-000305782386 env')
for line in stdout.read().decode('utf-8').split('\n'):
    if 'KEY' in line or 'PASS' in line:
        parts = line.split('=')
        print(f"{parts[0]}=******")
    else:
        print(line)

client.close()

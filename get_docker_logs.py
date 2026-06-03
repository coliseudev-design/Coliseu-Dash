import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('177.39.17.7', username='root', password='6EFBC!c0:wzr%Ij')

script = "docker inspect dashboard-middleware-irerzifjwjb4q8ucbpfk2gb8-134707159354 --format '{{json .Config.Env}}'"
stdin, stdout, stderr = client.exec_command(script)
print('STDOUT:', stdout.read().decode('utf-8'))
print('STDERR:', stderr.read().decode('utf-8'))

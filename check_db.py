import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('177.39.17.7', username='root', password='6EFBC!c0:wzr%Ij')

script = '''
container=$(docker ps --format "{{.Names}}" | grep middleware)
docker logs --tail 30 $container
'''
stdin, stdout, stderr = client.exec_command(script)
print('STDOUT:\n', stdout.read().decode('utf-8'))
print('STDERR:\n', stderr.read().decode('utf-8'))

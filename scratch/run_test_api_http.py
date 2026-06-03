import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('177.39.17.7', username='root', password='6EFBC!c0:wzr%Ij')

container = 'dashboard-middleware-irerzifjwjb4q8ucbpfk2gb8-145439028228'

sftp = client.open_sftp()
sftp.put('/Users/kleber/Documents/GitHub/Coliseu-Dash/scratch/test_api_http.js', '/tmp/test_api_http.js')
sftp.close()

client.exec_command(f"docker cp /tmp/test_api_http.js {container}:/usr/src/app/test_api_http.js")

stdin, stdout, stderr = client.exec_command(f"docker exec {container} node test_api_http.js")
print("=== STDOUT ===")
print(stdout.read().decode('utf-8'))
print("=== STDERR ===")
print(stderr.read().decode('utf-8'))

client.close()

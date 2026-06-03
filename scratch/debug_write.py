import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('177.39.17.7', username='root', password='6EFBC!c0:wzr%Ij')

MIDDLEWARE_CONTAINER = "dashboard-middleware-irerzifjwjb4q8ucbpfk2gb8-145439028228"

js_code = "console.log('hello world');"

stdin, stdout, stderr = client.exec_command(f"docker exec -i {MIDDLEWARE_CONTAINER} tee /usr/src/app/test_periods.js")
stdin.write(js_code)
stdin.close()
print("STDOUT:", stdout.read().decode('utf-8'))
print("STDERR:", stderr.read().decode('utf-8'))

client.close()

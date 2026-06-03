import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('177.39.17.7', username='root', password='6EFBC!c0:wzr%Ij')

MIDDLEWARE_CONTAINER = "dashboard-middleware-irerzifjwjb4q8ucbpfk2gb8-145439028228"

stdin, stdout, stderr = client.exec_command(f"docker exec {MIDDLEWARE_CONTAINER} pwd")
print("=== PWD ===")
print(stdout.read().decode('utf-8').strip())

stdin, stdout, stderr = client.exec_command(f"docker exec {MIDDLEWARE_CONTAINER} ls -l")
print("=== LS -L ===")
print(stdout.read().decode('utf-8').strip())

client.close()

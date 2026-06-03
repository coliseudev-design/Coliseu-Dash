import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('177.39.17.7', username='root', password='6EFBC!c0:wzr%Ij')

stdin, stdout, stderr = client.exec_command("docker ps")
print("=== DOCKER PS ===")
print(stdout.read().decode('utf-8'))

# Let's inspect logs of the middleware container
MIDDLEWARE_CONTAINER = "dashboard-middleware-irerzifjwjb4q8ucbpfk2gb8-145439028228"
stdin, stdout, stderr = client.exec_command(f"docker logs --tail 50 {MIDDLEWARE_CONTAINER}")
print("=== MIDDLEWARE LOGS ===")
print(stdout.read().decode('utf-8'))
print("=== MIDDLEWARE ERR LOGS ===")
print(stderr.read().decode('utf-8'))

client.close()

import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('177.39.17.7', username='root', password='6EFBC!c0:wzr%Ij')

frontend = "dashboard-frontend-irerzifjwjb4q8ucbpfk2gb8-213853059475"

print("=== Running curl from frontend to middleware ===")
stdin, stdout, stderr = client.exec_command(f"docker exec {frontend} curl -i http://dashboard-middleware:3200/health/liveness")
print("STDOUT:")
print(stdout.read().decode('utf-8'))
print("STDERR:")
print(stderr.read().decode('utf-8'))

print("\n=== Resolving dashboard-middleware via nslookup/ping inside frontend ===")
stdin, stdout, stderr = client.exec_command(f"docker exec {frontend} nslookup dashboard-middleware")
print("NSLOOKUP:")
print(stdout.read().decode('utf-8'))
print(stderr.read().decode('utf-8'))

client.close()

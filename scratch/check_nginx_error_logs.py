import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('177.39.17.7', username='root', password='6EFBC!c0:wzr%Ij')

frontend = "dashboard-frontend-irerzifjwjb4q8ucbpfk2gb8-213853059475"

print("=== Nginx error.log inside frontend container ===")
stdin, stdout, stderr = client.exec_command(f"docker exec {frontend} tail -n 100 /var/log/nginx/error.log")
print(stdout.read().decode('utf-8'))
print(stderr.read().decode('utf-8'))

print("=== Nginx access.log inside frontend container ===")
stdin, stdout, stderr = client.exec_command(f"docker exec {frontend} tail -n 20 /var/log/nginx/access.log")
print(stdout.read().decode('utf-8'))
print(stderr.read().decode('utf-8'))

client.close()

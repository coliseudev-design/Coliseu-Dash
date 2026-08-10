import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('177.39.17.7', username='root', password='6EFBC!c0:wzr%Ij')

frontend = 'dashboard-frontend-irerzifjwjb4q8ucbpfk2gb8-213853059475'
stdin, stdout, stderr = client.exec_command(f'docker exec {frontend} cat /var/log/nginx/error.log')
err = stdout.read().decode('utf-8')
print("=== NGINX ERRORS ===")
print(err[-3000:])

stdin, stdout, stderr = client.exec_command(f'docker exec {frontend} curl -i http://127.0.0.1/api/health/liveness')
curl_res = stdout.read().decode('utf-8')
print("=== CURL TO LOCAL NGINX /api ===")
print(curl_res)

client.close()

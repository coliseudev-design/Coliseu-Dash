import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('177.39.17.7', username='root', password='6EFBC!c0:wzr%Ij')

container_name = "coolify-proxy"

print(f"=== Logs for {container_name} ===")
stdin, stdout, stderr = client.exec_command(f"docker logs --tail 200 {container_name}")
print(stdout.read().decode('utf-8'))
print(stderr.read().decode('utf-8'))

client.close()

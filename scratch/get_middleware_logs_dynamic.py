import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('177.39.17.7', username='root', password='6EFBC!c0:wzr%Ij')

# Find middleware container
stdin, stdout, stderr = client.exec_command("docker ps --format '{{.Names}}' | grep dashboard-middleware")
middleware_container = stdout.read().decode('utf-8').strip()

print(f"Found middleware container: '{middleware_container}'")

if middleware_container:
    stdin, stdout, stderr = client.exec_command(f"docker logs --tail 200 {middleware_container}")
    print("=== STDOUT ===")
    print(stdout.read().decode('utf-8'))
    print("=== STDERR ===")
    print(stderr.read().decode('utf-8'))
else:
    print("No dashboard-middleware container found running.")

client.close()

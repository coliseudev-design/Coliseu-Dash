import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('177.39.17.7', username='root', password='6EFBC!c0:wzr%Ij')

# Find frontend container
stdin, stdout, stderr = client.exec_command("docker ps --format '{{.Names}}' | grep dashboard-frontend")
frontend_container = stdout.read().decode('utf-8').strip()

print(f"Found frontend container: '{frontend_container}'")

if frontend_container:
    stdin, stdout, stderr = client.exec_command(f"docker logs --tail 100 {frontend_container}")
    print("=== STDOUT ===")
    print(stdout.read().decode('utf-8'))
    print("=== STDERR ===")
    print(stderr.read().decode('utf-8'))
else:
    print("No dashboard-frontend container found running.")

client.close()

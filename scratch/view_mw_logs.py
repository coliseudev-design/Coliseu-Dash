import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('177.39.17.7', username='root', password='6EFBC!c0:wzr%Ij')

# Get middleware container name
stdin, stdout, stderr = client.exec_command("docker ps --format '{{.Names}}' | grep 'dashboard-middleware'")
MW = stdout.read().decode('utf-8').strip()
print(f"Active middleware container: {MW}")

if MW:
    stdin, stdout, stderr = client.exec_command(f"docker logs --tail 200 {MW}")
    print("=== Last 200 logs of middleware ===")
    print(stdout.read().decode('utf-8'))
    err = stderr.read().decode('utf-8')
    if err.strip():
        print("ERR:", err)
else:
    print("No active middleware container found!")

client.close()

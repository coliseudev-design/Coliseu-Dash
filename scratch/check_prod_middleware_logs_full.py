import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())

try:
    client.connect('2.24.82.19', username='root', password='Col@13894645', timeout=10)
    
    stdin, stdout, stderr = client.exec_command("docker ps --format '{{.Names}}' | grep 'dashboard-middleware'")
    container_name = stdout.read().decode('utf-8').strip().split('\n')[0]
    if container_name:
        print(f"=== Logs for {container_name} ===")
        stdin, stdout, stderr = client.exec_command(f"docker logs --tail 150 {container_name}")
        print(stdout.read().decode('utf-8'))
    else:
        print("Middleware container not found!")

except Exception as e:
    print("Error:", e)
finally:
    client.close()

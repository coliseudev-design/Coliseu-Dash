import paramiko

HOST = '2.24.82.19'
USER = 'root'
PASS = 'Col@13894645'

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())

try:
    client.connect(HOST, username=USER, password=PASS, timeout=10)
    
    # Get middleware container name
    stdin, stdout, _ = client.exec_command("docker ps --format '{{.Names}}' | grep 'dashboard-middleware'")
    container_name = stdout.read().decode('utf-8').strip()
    
    if container_name:
        print(f"Container: {container_name}")
        # Search last 30000 lines for sync events, errors, or warnings
        cmd = f"docker logs --tail 30000 {container_name} 2>&1 | grep -i -E 'dash_vendas|error|warning|sync|falha' | tail -n 100"
        _, stdout, _ = client.exec_command(cmd)
        print("=== MATCHING SYNC LOGS ===")
        print(stdout.read().decode('utf-8'))
    else:
        print("Middleware container not found!")
            
except Exception as e:
    print("ERRO:", e)
finally:
    client.close()

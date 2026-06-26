import paramiko

HOST = '2.24.82.19'
USER = 'root'
PASS = 'Col@13894645'

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())

try:
    client.connect(HOST, username=USER, password=PASS, timeout=10)
    
    stdin, stdout, _ = client.exec_command("docker ps --format '{{.Names}}' | grep 'dashboard-middleware'")
    container_name = stdout.read().decode('utf-8').strip()
    
    if container_name:
        # Search middleware logs for error, fail, skip, or exception
        cmd = f"docker logs --tail 10000 {container_name} 2>&1 | grep -i -E 'error|fail|skip|exception|rejeitado|invalid' | tail -n 50"
        _, stdout, _ = client.exec_command(cmd)
        print("=== MIDDLEWARE LOGS (ERRORS/EXCEPTIONS) ===")
        print(stdout.read().decode('utf-8'))
    else:
        print("Container not found!")
        
except Exception as e:
    print("ERRO:", e)
finally:
    client.close()

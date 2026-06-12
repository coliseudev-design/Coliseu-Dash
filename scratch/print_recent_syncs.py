import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())

try:
    client.connect('2.24.82.19', username='root', password='Col@13894645')
    
    stdin, stdout, stderr = client.exec_command("docker ps --format '{{.Names}}' | grep 'dashboard-middleware'")
    container_name = stdout.read().decode('utf-8').strip().split('\n')[0]
    if not container_name:
        print("Error: dashboard-middleware container not found!")
    else:
        cmd = f"docker logs --tail 30000 {container_name}"
        stdin, stdout, stderr = client.exec_command(cmd)
        
        lines = stdout.read().decode('utf-8', errors='replace').splitlines()
        count = 0
        for line in reversed(lines):
            if "Recebido sync para tabela dash_vendas com" in line:
                print("INFO:", line)
            elif "Primeira linha:" in line and "NUMERO_PEDIDO" in line:
                print("PAYLOAD:", line)
                count += 1
                if count >= 10:
                    break
except Exception as e:
    print("Error:", e)
finally:
    client.close()

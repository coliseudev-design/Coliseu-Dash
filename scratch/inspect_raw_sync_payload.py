import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('2.24.82.19', username='root', password='Col@13894645')

def search_logs():
    stdin, stdout, stderr = client.exec_command("docker ps --format '{{.Names}}' | grep 'dashboard-middleware'")
    container_name = stdout.read().decode('utf-8').strip().split('\n')[0]
    if not container_name:
        print("Error: dashboard-middleware container not found!")
        return
        
    cmd = f"docker logs --tail 8000 {container_name}"
    stdin, stdout, stderr = client.exec_command(cmd)
    
    lines = stdout.read().decode('utf-8', errors='replace').splitlines()
    for i in range(len(lines)):
        if "Recebido sync para tabela dash_vendas" in lines[i]:
            print("INFO LINE:", lines[i])
            if i + 1 < len(lines) and "Primeira linha:" in lines[i+1]:
                print("DATA LINE:", lines[i+1])
                print("-" * 50)

search_logs()
client.close()

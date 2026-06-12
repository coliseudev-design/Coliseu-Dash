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
        
    cmd = f"docker logs --tail 5000 {container_name}"
    stdin, stdout, stderr = client.exec_command(cmd)
    
    tables_synced = set()
    for line in stdout.read().decode('utf-8', errors='replace').splitlines():
        if "sync" in line.lower() and "recebido" in line.lower():
            # e.g., Recebido sync para tabela dash_vendas com 2 linhas
            print(line)
            words = line.split()
            for w in words:
                if w.startswith("dash_"):
                    tables_synced.add(w)
                    
    print("\nSynced Tables in Logs:", list(tables_synced))

search_logs()
client.close()

import paramiko
import json

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
    
    statuses = set()
    for line in stdout.read().decode('utf-8', errors='replace').splitlines():
        if "[SyncDebug] Recebido sync para tabela dash_vendas" in line:
            print(line)
        if '"status":' in line.lower() or '"status":' in line:
            # try to find the status value
            try:
                # Find start of json
                idx = line.find('{')
                if idx != -1:
                    data = json.loads(line[idx:])
                    if 'STATUS' in data:
                        statuses.add(data['STATUS'])
                    elif 'status' in data:
                        statuses.add(data['status'])
            except Exception as e:
                pass
                
    print("\nAll observed STATUS values in logs:", list(statuses))

search_logs()
client.close()

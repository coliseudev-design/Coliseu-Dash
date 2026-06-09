import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('2.24.82.19', username='root', password='Col@13894645', timeout=10)

def search_logs():
    # Find container name dynamically
    stdin, stdout, stderr = client.exec_command("docker ps --format '{{.Names}}' | grep 'dashboard-middleware'")
    container_name = stdout.read().decode('utf-8').strip().split('\n')[0]
    if not container_name:
        print("Error: dashboard-middleware container not found!")
        return
        
    cmd = f"docker logs --tail 2000 {container_name}"
    stdin, stdout, stderr = client.exec_command(cmd)
    
    # Process lines
    vendas_count = 0
    heartbeats = {}
    for line in stdout.read().decode('utf-8', errors='replace').splitlines():
        if "syncdebug" in line.lower() or "recebido sync" in line.lower():
            print(line)
        if "heartbeat" in line.lower() and "tenant:" in line.lower():
            # Extract tenant ID
            parts = line.split("Tenant:")
            if len(parts) > 1:
                t_id = parts[1].split()[0].strip()
                heartbeats[t_id] = heartbeats.get(t_id, 0) + 1

    print("\n=== Heartbeats by Tenant in Logs ===")
    for tid, count in heartbeats.items():
        print(f"Tenant {tid}: {count} heartbeats")

search_logs()
client.close()

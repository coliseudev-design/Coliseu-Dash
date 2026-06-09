import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('2.24.82.19', username='root', password='Col@13894645', timeout=10)

def search_piveta_logs():
    stdin, stdout, stderr = client.exec_command("docker ps --format '{{.Names}}' | grep 'dashboard-middleware'")
    container_name = stdout.read().decode('utf-8').strip().split('\n')[0]
    if not container_name:
        print("Error: dashboard-middleware container not found!")
        return

    cmd = f"docker logs {container_name}"
    stdin, stdout, stderr = client.exec_command(cmd)
    
    tenant_id = "1e40d65f-4319-4c68-ae13-66223820c095"
    found_lines = []
    
    for line in stdout.read().decode('utf-8', errors='replace').splitlines():
        if tenant_id in line or "piveta" in line.lower():
            found_lines.append(line)
            
    print(f"Total lines found for Piveta: {len(found_lines)}")
    for l in found_lines[-50:]:  # Print last 50 matches
        print(l)

search_piveta_logs()
client.close()

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
        cmd = f"docker logs --tail 50000 {container_name}"
        stdin, stdout, stderr = client.exec_command(cmd)
        
        lines = stdout.read().decode('utf-8', errors='replace').splitlines()
        found = 0
        for line in lines:
            if "dash_devolucoes" in line:
                print(line)
                found += 1
        print(f"Total matching lines for dash_devolucoes: {found}")
except Exception as e:
    print("Error:", e)
finally:
    client.close()

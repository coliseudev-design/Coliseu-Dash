import paramiko

HOST = '177.39.17.7'
USER = 'root'
PASS = '6EFBC!c0:wzr%Ij'

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())

try:
    client.connect(HOST, username=USER, password=PASS)
    
    # 1. Discover middleware container name
    stdin, stdout, stderr = client.exec_command("docker ps --format '{{.Names}}' | grep 'dashboard-middleware'")
    MW = stdout.read().decode('utf-8').strip()
    print(f"Middleware container: {MW}")
    
    if not MW:
        print("No active middleware container found matching 'dashboard-middleware'.")
    else:
        # 2. Get last 150 lines of logs
        stdin, stdout, stderr = client.exec_command(f"docker logs --tail 150 {MW}")
        out = stdout.read().decode('utf-8')
        err = stderr.read().decode('utf-8')
        
        print("\n=== Middleware Container Logs (stdout) ===")
        print(out)
        
        if err.strip():
            print("\n=== Middleware Container Logs (stderr) ===")
            print(err)
            
except Exception as e:
    print(f"Error: {e}")
finally:
    client.close()

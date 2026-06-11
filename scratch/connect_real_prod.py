import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
try:
    print("Attempting connection to production server (2.24.82.19)...")
    client.connect('2.24.82.19', username='root', password='Col@13894645', timeout=10)
    print("Connection SUCCESSFUL!")
    
    stdin, stdout, stderr = client.exec_command('docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"')
    print("=== Production Containers ===")
    print(stdout.read().decode('utf-8'))
except Exception as e:
    print("Connection FAILED:", e)
finally:
    client.close()

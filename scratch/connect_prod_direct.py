import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
try:
    print("Attempting direct connection to production (38.242.244.84)...")
    client.connect('38.242.244.84', username='root', password='6EFBC!c0:wzr%Ij', timeout=10)
    print("Direct connection SUCCESSFUL!")
    
    stdin, stdout, stderr = client.exec_command('docker ps --format "{{.Names}}"')
    print("=== Active Containers ===")
    print(stdout.read().decode('utf-8'))
except Exception as e:
    print("Direct connection FAILED:", e)
finally:
    client.close()

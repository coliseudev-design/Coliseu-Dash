import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
try:
    print("Connecting to staging 177.39.17.7 via SSH...")
    client.connect('177.39.17.7', username='root', password='6EFBC!c0:wzr%Ij', timeout=10)
    print("Success!")
    
    # 1. Encontrar o container do banco de dados no Production
    cmd_ps = "sshpass -p 'ColiseuDB2026Prod' ssh -o StrictHostKeyChecking=no root@2.24.82.19 \"docker ps\""
    stdin, stdout, stderr = client.exec_command(cmd_ps)
    out = stdout.read().decode('utf-8')
    err = stderr.read().decode('utf-8')
    print("=== docker ps on prod ===")
    print(out)
    print("err:", err)
    
except Exception as e:
    print("Error:", e)
finally:
    client.close()

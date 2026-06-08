import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
try:
    print("Connecting to staging 177.39.17.7 via SSH...")
    client.connect('177.39.17.7', username='root', password='6EFBC!c0:wzr%Ij', timeout=10)
    print("Success!")
    
    # 1. Encontrar o container do banco de dados no Production
    cmd_ps = "sshpass -p '6EFBC!c0:wzr%Ij' ssh -o StrictHostKeyChecking=no root@38.242.244.84 \"docker ps\""
    stdin, stdout, stderr = client.exec_command(cmd_ps)
    out = stdout.read().decode('utf-8')
    err = stderr.read().decode('utf-8')
    print("=== docker ps on 38.242.244.84 ===")
    print(out)
    print("err:", err)
    
except Exception as e:
    print("Error:", e)
finally:
    client.close()

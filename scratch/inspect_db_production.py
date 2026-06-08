import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
try:
    print("Connecting to staging 177.39.17.7 via SSH...")
    client.connect('177.39.17.7', username='root', password='6EFBC!c0:wzr%Ij', timeout=10)
    print("Success!")
    
    stdin, stdout, stderr = client.exec_command("sshpass -V")
    out = stdout.read().decode('utf-8')
    err = stderr.read().decode('utf-8')
    print("sshpass -V out:", out)
    print("sshpass -V err:", err)
    
except Exception as e:
    print("Error:", e)
finally:
    client.close()

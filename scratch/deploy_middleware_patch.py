import paramiko

host = '177.39.17.7'
user = 'root'
password = '6EFBC!c0:wzr%Ij'
container = 'dashboard-middleware-irerzifjwjb4q8ucbpfk2gb8-145439028228'

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
try:
    client.connect(host, username=user, password=password)
    print("Connected to VPS")

    sftp = client.open_sftp()
    
    # 1. Upload vendas.js
    sftp.put('/Users/kleber/Documents/GitHub/Coliseu-Dash/middleware/src/routes/vendas.js', '/tmp/vendas.js')
    print("Uploaded vendas.js to VPS /tmp")

    # 2. Upload cfop.js
    sftp.put('/Users/kleber/Documents/GitHub/Coliseu-Dash/middleware/src/utils/cfop.js', '/tmp/cfop.js')
    print("Uploaded cfop.js to VPS /tmp")

    sftp.close()

    # 3. Copy files into container
    stdin, stdout, stderr = client.exec_command(f"docker cp /tmp/vendas.js {container}:/usr/src/app/src/routes/vendas.js")
    err = stderr.read().decode('utf-8')
    if err:
        print("Copy error vendas.js:", err)
    else:
        print("Copied vendas.js inside container")

    stdin, stdout, stderr = client.exec_command(f"docker cp /tmp/cfop.js {container}:/usr/src/app/src/utils/cfop.js")
    err = stderr.read().decode('utf-8')
    if err:
        print("Copy error cfop.js:", err)
    else:
        print("Copied cfop.js inside container")

    # 4. Restart container
    print("Restarting middleware container...")
    stdin, stdout, stderr = client.exec_command(f"docker restart {container}")
    out = stdout.read().decode('utf-8')
    err = stderr.read().decode('utf-8')
    if err:
        print("Restart error:", err)
    else:
        print("Container restarted successfully:", out.strip())

except Exception as e:
    print("Error:", e)
finally:
    client.close()

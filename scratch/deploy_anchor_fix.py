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

    # 2. Upload estatisticas.js
    sftp.put('/Users/kleber/Documents/GitHub/Coliseu-Dash/middleware/src/routes/estatisticas.js', '/tmp/estatisticas.js')
    print("Uploaded estatisticas.js to VPS /tmp")

    # 3. Upload financeiro.js
    sftp.put('/Users/kleber/Documents/GitHub/Coliseu-Dash/middleware/src/routes/financeiro.js', '/tmp/financeiro.js')
    print("Uploaded financeiro.js to VPS /tmp")

    sftp.close()

    # Copy files into container
    def cp_to_container(src_temp, dest_path):
        stdin, stdout, stderr = client.exec_command(f"docker cp {src_temp} {container}:{dest_path}")
        err = stderr.read().decode('utf-8')
        if err:
            print(f"Copy error for {dest_path}:", err)
        else:
            print(f"Copied {dest_path} inside container")

    cp_to_container('/tmp/vendas.js', '/usr/src/app/src/routes/vendas.js')
    cp_to_container('/tmp/estatisticas.js', '/usr/src/app/src/routes/estatisticas.js')
    cp_to_container('/tmp/financeiro.js', '/usr/src/app/src/routes/financeiro.js')

    # Restart container
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

import paramiko

host = '177.39.17.7'
user = 'root'
password = '6EFBC!c0:wzr%Ij'
container = 'dashboard-middleware-irerzifjwjb4q8ucbpfk2gb8-065623991725'

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
try:
    client.connect(host, username=user, password=password)
    print("Connected to VPS")

    sftp = client.open_sftp()
    
    # Upload bi.js
    sftp.put('/Users/kleber/Documents/GitHub/Coliseu-Dash/middleware/src/routes/bi.js', '/tmp/bi.js')
    print("Uploaded bi.js to VPS /tmp")

    sftp.close()

    # Copy files into container
    stdin, stdout, stderr = client.exec_command(f"docker cp /tmp/bi.js {container}:/usr/src/app/src/routes/bi.js")
    err = stderr.read().decode('utf-8')
    if err:
        print("Copy error bi.js:", err)
    else:
        print("Copied bi.js inside container")

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

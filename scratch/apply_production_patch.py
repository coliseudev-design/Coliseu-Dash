import paramiko

HOST = '38.242.244.84'
USER = 'root'
PASS = '6EFBC!c0:wzr%Ij'

def deploy_file(local_path, remote_path):
    print(f"Deploying {local_path} to {remote_path}...")
    with open(local_path, 'r', encoding='utf-8') as f:
        content = f.read()
        
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        client.connect(HOST, username=USER, password=PASS, timeout=10)
        sftp = client.open_sftp()
        with sftp.file(remote_path, 'w') as f_remote:
            f_remote.write(content)
        sftp.close()
        print("Success!")
    except Exception as e:
        print("Error:", e)
    finally:
        client.close()

# Deploy auth.js
deploy_file(
    '/Users/kleber/Documents/GitHub/Coliseu-Dash/middleware/src/middleware/auth.js',
    '/root/Coliseu-Dash/middleware/src/middleware/auth.js'
)

# Deploy cfop.js
deploy_file(
    '/Users/kleber/Documents/GitHub/Coliseu-Dash/middleware/src/utils/cfop.js',
    '/root/Coliseu-Dash/middleware/src/utils/cfop.js'
)

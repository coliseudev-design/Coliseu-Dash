import paramiko
import os

FILES_TO_DEPLOY = [
    ('middleware/src/db/postgres.js', '/usr/src/app/src/db/postgres.js'),
    ('middleware/src/routes/bi.js', '/usr/src/app/src/routes/bi.js'),
    ('middleware/src/routes/financeiro.js', '/usr/src/app/src/routes/financeiro.js'),
    ('middleware/src/routes/estatisticas.js', '/usr/src/app/src/routes/estatisticas.js'),
]

ENVS = [
    {
        'host': '2.24.82.19',
        'password': 'Col@13894645',
        'label': 'Production Server (2.24.82.19)'
    },
    {
        'host': '177.39.17.7',
        'password': '6EFBC!c0:wzr%Ij',
        'label': 'Database & Staging Server (177.39.17.7)'
    }
]

def deploy_to_server(env):
    print(f"\n🚀 Deploying to {env['label']} ({env['host']})...")
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        client.connect(env['host'], username='root', password=env['password'])
        print("✅ SSH connected.")
        
        # Discover container name
        stdin, stdout, stderr = client.exec_command("docker ps --format '{{.Names}}' | grep 'dashboard-middleware'")
        container_names = stdout.read().decode('utf-8').strip().split('\n')
        container_name = container_names[0] if container_names[0] else None
        
        if not container_name:
            print("⚠️ Warning: No active dashboard-middleware container found on this host!")
            return
        
        print(f"✅ Found active container: {container_name}")
        
        sftp = client.open_sftp()
        for local_path, container_path in FILES_TO_DEPLOY:
            if not os.path.exists(local_path):
                print(f"❌ Error: Local file {local_path} not found!")
                continue
            
            filename = os.path.basename(local_path)
            temp_vps_path = f"/tmp/{filename}"
            print(f"  Uploading {filename} -> {temp_vps_path}")
            sftp.put(local_path, temp_vps_path)
            
            # Copy inside container
            copy_cmd = f"docker cp {temp_vps_path} {container_name}:{container_path}"
            client.exec_command(copy_cmd)[1].read()
            
            # Clean up temp
            client.exec_command(f"rm {temp_vps_path}")
            
        sftp.close()
        
        # Restart container
        print(f"🔄 Restarting container {container_name}...")
        client.exec_command(f"docker restart {container_name}")[1].read()
        print("✅ Container restarted successfully!")
        
    except Exception as e:
        print(f"❌ Error on server {env['host']}: {e}")
    finally:
        client.close()

for env in ENVS:
    deploy_to_server(env)

print("\n🎉 Deployment completed on all servers!")

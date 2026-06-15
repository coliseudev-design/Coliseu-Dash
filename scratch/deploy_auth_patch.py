import paramiko
import os

HOST     = '2.24.82.19'
USER     = 'root'
PASSWORD = 'Col@13894645'

def main():
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        client.connect(HOST, username=USER, password=PASSWORD)
        print("Connected to Prod VPS")

        # Discover active container name dynamically
        stdin, stdout, stderr = client.exec_command("docker ps --format '{{.Names}}' | grep 'dashboard-middleware'")
        container_name = stdout.read().decode('utf-8').strip().split('\n')[0]
        if not container_name:
            print("Error: dashboard-middleware container not found!")
            return
        print(f"Container: {container_name}")

        local_path = "middleware/src/routes/auth.js"
        filename = os.path.basename(local_path)
        temp_vps_path = f"/tmp/{filename}"

        # Upload file via SFTP
        sftp = client.open_sftp()
        print(f"Uploading {local_path} -> {temp_vps_path} ...")
        sftp.put(local_path, temp_vps_path)
        sftp.close()

        # Copy to container
        copy_cmd = f"docker cp {temp_vps_path} {container_name}:/usr/src/app/src/routes/auth.js"
        stdin, stdout, stderr = client.exec_command(copy_cmd)
        print("Copy stdout:", stdout.read().decode('utf-8'))
        print("Copy stderr:", stderr.read().decode('utf-8'))

        # Remove temp file
        client.exec_command(f"rm {temp_vps_path}")

        # Restart middleware container
        print("Restarting middleware container...")
        stdin, stdout, stderr = client.exec_command(f"docker restart {container_name}")
        print("Restart stdout:", stdout.read().decode('utf-8'))
        
        print("OK: Deploy patched auth.js successfully!")

    except Exception as e:
        print(f"Error: {e}")
    finally:
        client.close()

if __name__ == '__main__':
    main()

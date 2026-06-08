import paramiko

HOST     = '177.39.17.7'
USER     = 'root'
PASSWORD = '6EFBC!c0:wzr%Ij'

def main():
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        client.connect(HOST, username=USER, password=PASSWORD)
        print("Connected to VPS")

        # Discover active container name dynamically
        stdin, stdout, stderr = client.exec_command("docker ps --format '{{.Names}}' | grep 'dashboard-middleware'")
        container_name = stdout.read().decode('utf-8').strip().split('\n')[0]
        if not container_name:
            print("Error: middleware container not found!")
            return
        print(f"Container: {container_name}")

        stdin, stdout, stderr = client.exec_command(f"docker exec {container_name} env")
        out = stdout.read().decode('utf-8', errors='replace').strip()
        err = stderr.read().decode('utf-8', errors='replace').strip()
        
        print("=== ENVIRONMENT VARIABLES ===")
        for line in out.splitlines():
            if any(k in line for k in ['PG', 'JWT', 'PORT', 'NODE_ENV', 'KEY', 'URL', 'SLUG']):
                # Mask secret key values
                if 'KEY' in line or 'SECRET' in line or 'PASSWORD' in line or 'JWT' in line:
                    parts = line.split('=', 1)
                    if len(parts) > 1:
                        print(f"{parts[0]}=********")
                    else:
                        print(line)
                else:
                    print(line)

        if err:
            print("=== ERROR ===")
            print(err)

    except Exception as e:
        print(f"Error: {e}")
    finally:
        client.close()

if __name__ == '__main__':
    main()

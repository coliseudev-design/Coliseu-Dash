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

        # Let's inspect labels for the containers
        cmd = "docker inspect -f '{{.Name}} Labels: {{json .Config.Labels}}' $(docker ps -q)"
        stdin, stdout, stderr = client.exec_command(cmd)
        out = stdout.read().decode('utf-8', errors='replace').strip()
        
        print("LABELS:")
        for line in out.splitlines():
            if 'frontend' in line or 'middleware' in line or 'api-' in line:
                print(line[:200] + "...")

    except Exception as e:
        print(f"Error: {e}")
    finally:
        client.close()

if __name__ == '__main__':
    main()

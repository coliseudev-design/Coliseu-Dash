import paramiko

STAGING_HOST = '177.39.17.7'
STAGING_USER = 'root'
STAGING_PASS = '6EFBC!c0:wzr%Ij'

PROD_HOST = '2.24.82.19'
PROD_PASS = 'ColiseuDB2026Prod'

def run_cmd_on_prod(client, prod_cmd):
    sshpass_cmd = f"sshpass -p '{PROD_PASS}' ssh -o StrictHostKeyChecking=no root@{PROD_HOST} \"{prod_cmd}\""
    stdin, stdout, stderr = client.exec_command(sshpass_cmd)
    out = stdout.read().decode('utf-8', errors='replace').strip()
    err = stderr.read().decode('utf-8', errors='replace').strip()
    return out, err

def main():
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        client.connect(STAGING_HOST, username=STAGING_USER, password=STAGING_PASS)
        print("Connected to Staging VPS 177.39.17.7")

        # Get all docker containers
        out_containers, err = run_cmd_on_prod(client, "docker ps -a")
        print("Production Containers:")
        print(out_containers)
        if err:
            print("ERROR:")
            print(err)

    except Exception as e:
        print(f"Error: {e}")
    finally:
        client.close()

if __name__ == '__main__':
    main()

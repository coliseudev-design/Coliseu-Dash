import paramiko

HOST     = '2.24.82.19'
USER     = 'root'
PASSWORD = 'Col@13894645'

def main():
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        client.connect(HOST, username=USER, password=PASSWORD)
        print("Connected to Prod VPS")

        # Run inspect in container
        stdin, stdout, stderr = client.exec_command("docker inspect api-szm3mlq03szb6v2mikkq5aqk-130506971768")
        print("Container Inspect:")
        print(stdout.read().decode('utf-8'))

    except Exception as e:
        print(f"Error: {e}")
    finally:
        client.close()

if __name__ == '__main__':
    main()

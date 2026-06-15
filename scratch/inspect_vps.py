import paramiko

HOST     = '2.24.82.19'
USER     = 'root'
PASSWORD = 'Col@13894645'

def main():
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        client.connect(HOST, username=USER, password=PASSWORD)
        print("OK: Conectado à VPS")

        # docker ps
        stdin, stdout, stderr = client.exec_command("docker ps")
        print("\n=== DOCKER PS ===")
        print(stdout.read().decode('utf-8'))

        # Discover container name
        stdin, stdout, stderr = client.exec_command("docker ps --format '{{.Names}}' | grep 'dashboard-middleware'")
        container_name = stdout.read().decode('utf-8').strip().split('\n')[0]
        if container_name:
            print(f"Container: {container_name}")
            stdin, stdout, stderr = client.exec_command(f"docker inspect {container_name}")
            import json
            inspect_data = json.loads(stdout.read().decode('utf-8'))
            
            # Print port bindings and environment variables
            env_vars = inspect_data[0]['Config']['Env']
            print("\n=== ENV VARS ===")
            for ev in env_vars:
                if any(x in ev for x in ['PORT', 'JWT', 'DB', 'PG', 'IDENTITY']):
                    print(ev)
                    
            # Print logs tail
            print("\n=== RECENT CONTAINER LOGS ===")
            stdin, stdout, stderr = client.exec_command(f"docker logs --tail 20 {container_name}")
            print(stdout.read().decode('utf-8'))
            print(stderr.read().decode('utf-8'))

    except Exception as e:
        print(f"Erro: {e}")
    finally:
        client.close()

if __name__ == '__main__':
    main()

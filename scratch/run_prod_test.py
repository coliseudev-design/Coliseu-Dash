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

        # Discover active container name
        stdin, stdout, stderr = client.exec_command("docker ps --format '{{.Names}}' | grep 'dashboard-middleware'")
        container_name = stdout.read().decode('utf-8').strip().split('\n')[0]
        if not container_name:
            print("Erro: Container do middleware não encontrado!")
            return
        print(f"OK: Container ativo encontrado: {container_name}")

        # Upload the test file
        sftp = client.open_sftp()
        local_path = 'scratch/test_superuser_login.js'
        temp_vps_path = '/tmp/test_superuser_login.js'
        container_path = '/tmp/test_superuser_login.js'

        print(f"Uploading {local_path} -> {temp_vps_path} ...")
        sftp.put(local_path, temp_vps_path)
        sftp.close()

        # Copy to container
        client.exec_command(f"docker cp {temp_vps_path} {container_name}:{container_path}")
        print("Copiado para o container.")

        # Run the script inside container
        print("\n>>> Executando script de testes de login no container...")
        stdin, stdout, stderr = client.exec_command(f"docker exec {container_name} node {container_path}")
        
        out = stdout.read().decode('utf-8')
        err = stderr.read().decode('utf-8')

        print("\n=== SAÍDA DO TESTE ===")
        print(out)
        if err.strip():
            print("=== ERRO DO TESTE ===")
            print(err)

        # Cleanup
        client.exec_command(f"rm {temp_vps_path}")
        client.exec_command(f"docker exec {container_name} rm {container_path}")
        print("Limpeza concluída.")

    except Exception as e:
        print(f"Erro ao executar testes na VPS: {e}")
    finally:
        client.close()

if __name__ == '__main__':
    main()

import paramiko
import os
import sys

HOST     = '2.24.82.19'
USER     = 'root'
PASSWORD = 'Col@13894645'

FILES_TO_DEPLOY = [
    ('middleware/src/routes/estatisticas.js', '/usr/src/app/src/routes/estatisticas.js'),
    ('middleware/src/routes/bi.js', '/usr/src/app/src/routes/bi.js'),
    ('middleware/src/routes/vendas.js', '/usr/src/app/src/routes/vendas.js'),
    ('middleware/src/routes/ranking.js', '/usr/src/app/src/routes/ranking.js'),
    ('middleware/src/routes/sync.js', '/usr/src/app/src/routes/sync.js'),
    ('middleware/src/db/postgres.js', '/usr/src/app/src/db/postgres.js'),
    ('middleware/src/utils/cfop.js', '/usr/src/app/src/utils/cfop.js'),
    ('middleware/src/routes/financeiro.js', '/usr/src/app/src/routes/financeiro.js'),
    ('middleware/src/routes/grupos.js', '/usr/src/app/src/routes/grupos.js'),
    ('middleware/src/routes/filiais.js', '/usr/src/app/src/routes/filiais.js'),
    ('middleware/src/db/cleanup_non_faturados.js', '/usr/src/app/src/db/cleanup_non_faturados.js'),
]

def run(client, cmd, label=""):
    print(f"\n>>> {label or cmd[:80]}")
    stdin, stdout, stderr = client.exec_command(cmd)
    out = stdout.read().decode('utf-8', errors='replace').strip()
    err = stderr.read().decode('utf-8', errors='replace').strip()
    if out: print("OUT:", out)
    if err: print("ERR:", err)
    return out, err

def main():
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        client.connect(HOST, username=USER, password=PASSWORD)
        print("OK: Conectado à VPS")

        # Discover active container name dynamically
        stdin, stdout, stderr = client.exec_command("docker ps --format '{{.Names}}' | grep 'dashboard-middleware'")
        container_name = stdout.read().decode('utf-8').strip().split('\n')[0]
        if not container_name:
            print("Erro: Container do middleware não encontrado!")
            return
        print(f"OK: Container ativo encontrado: {container_name}")

        # Open SFTP client
        sftp = client.open_sftp()
        
        # Upload each file to a temporary location on VPS, then copy to docker container
        for local_path, container_path in FILES_TO_DEPLOY:
            if not os.path.exists(local_path):
                print(f"Erro: Arquivo local {local_path} não encontrado!")
                continue
            
            filename = os.path.basename(local_path)
            temp_vps_path = f"/tmp/{filename}"
            
            print(f"Uploading {local_path} -> {temp_vps_path} ...")
            sftp.put(local_path, temp_vps_path)
            
            # Copy from VPS temp to docker container path
            copy_cmd = f"docker cp {temp_vps_path} {container_name}:{container_path}"
            run(client, copy_cmd, f"Copiando {filename} para o container")
            
            # Clean up temp file on VPS
            run(client, f"rm {temp_vps_path}", f"Removendo arquivo temporário {filename}")

        sftp.close()

        # Restart middleware container to apply updates
        run(client, f"docker restart {container_name}", "Reiniciando o container de middleware")
        
        # Aguarda 3 segundos para o container subir e rodar as migrações automáticas
        import time
        print("Aguardando 3 segundos para inicialização do container...")
        time.sleep(3)
        
        # Executa a limpeza histórica de dados inválidos no banco de dados principal
        cleanup_cmd = f"docker exec {container_name} node /usr/src/app/src/db/cleanup_non_faturados.js"
        run(client, cleanup_cmd, "Executando limpeza de vendas inválidas/canceladas no banco")
        
        print("\nOK: Deploy e limpeza do middleware concluídos com sucesso!")

    except Exception as e:
        print(f"Erro durante o deploy: {e}")
    finally:
        client.close()

if __name__ == '__main__':
    main()

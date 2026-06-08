import paramiko
import os

HOST     = '177.39.17.7'
USER     = 'root'
PASSWORD = '6EFBC!c0:wzr%Ij'

FILES_TO_DEPLOY = [
    ('middleware/src/utils/cfop.js', '/usr/src/app/src/utils/cfop.js'),
    ('middleware/src/routes/clientes.js', '/usr/src/app/src/routes/clientes.js'),
    ('middleware/src/routes/estatisticas.js', '/usr/src/app/src/routes/estatisticas.js'),
    ('middleware/src/routes/ranking.js', '/usr/src/app/src/routes/ranking.js'),
    ('middleware/src/routes/vendas.js', '/usr/src/app/src/routes/vendas.js'),
    ('middleware/src/routes/debug.js', '/usr/src/app/src/routes/debug.js'),
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
        print("✓ Conectado à VPS")

        # Get active middleware container name dynamically
        stdin, stdout, stderr = client.exec_command("docker ps --format '{{.Names}}' | grep 'dashboard-middleware'")
        container_name = stdout.read().decode('utf-8').strip()
        print(f"Container middleware detectado: {container_name}")
        
        if not container_name:
            print("Erro: Não foi possível detectar o container de middleware ativo!")
            return

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

        # Restart middleware container
        run(client, f"docker restart {container_name}", "Reiniciando o container de middleware")
        print("\n✓ Deploy do middleware concluído com sucesso!")

    except Exception as e:
        print(f"Erro durante o deploy: {e}")
    finally:
        client.close()

if __name__ == '__main__':
    main()

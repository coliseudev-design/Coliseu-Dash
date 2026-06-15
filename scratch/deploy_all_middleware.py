import paramiko
import os
import sys
import time

ENVIRONMENTS = [
    {
        "name": "Staging",
        "host": "177.39.17.7",
        "user": "root",
        "pass": "6EFBC!c0:wzr%Ij"
    },
    {
        "name": "Production",
        "host": "2.24.82.19",
        "user": "root",
        "pass": "Col@13894645"
    }
]

FILES_TO_DEPLOY = [
    ('middleware/src/index.js', '/usr/src/app/src/index.js'),
    ('middleware/src/utils/rbac.js', '/usr/src/app/src/utils/rbac.js'),
    ('middleware/src/routes/auth.js', '/usr/src/app/src/routes/auth.js'),
    ('middleware/src/routes/usuarios.js', '/usr/src/app/src/routes/usuarios.js'),
    ('middleware/src/routes/grupos.js', '/usr/src/app/src/routes/grupos.js'),
]

def run(client, cmd, label=""):
    print(f"\n>>> {label or cmd[:80]}")
    stdin, stdout, stderr = client.exec_command(cmd)
    out = stdout.read().decode('utf-8', errors='replace').strip()
    err = stderr.read().decode('utf-8', errors='replace').strip()
    if out: print("OUT:", out)
    if err: print("ERR:", err)
    return out, err

def deploy_to_env(env):
    print(f"\n==================================================")
    print(f" Iniciando Deploy para {env['name']} ({env['host']})")
    print(f"==================================================")
    
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        client.connect(env['host'], username=env['user'], password=env['pass'])
        print(f"OK: Conectado a {env['name']}")

        # Discover container name dynamically
        stdin, stdout, stderr = client.exec_command("docker ps --format '{{.Names}}' | grep -E 'coliseu-mw|dashboard-middleware'")
        container_names = stdout.read().decode('utf-8').strip().split('\n')
        container_name = container_names[0] if container_names and container_names[0] else None
        
        if not container_name:
            print(f"Erro: Container do middleware não encontrado em {env['name']}!")
            return False
        
        print(f"OK: Container ativo encontrado: {container_name}")

        # Open SFTP client
        sftp = client.open_sftp()
        
        # Upload each file
        for local_path, container_path in FILES_TO_DEPLOY:
            if not os.path.exists(local_path):
                print(f"Erro: Arquivo local {local_path} não encontrado!")
                continue
            
            filename = os.path.basename(local_path)
            temp_vps_path = f"/tmp/{filename}"
            
            print(f"Uploading {local_path} -> {temp_vps_path} ...")
            sftp.put(local_path, temp_vps_path)
            
            # Copy to docker container path
            copy_cmd = f"docker cp {temp_vps_path} {container_name}:{container_path}"
            run(client, copy_cmd, f"Copiando {filename} para o container")
            
            # Clean up temp file on VPS
            run(client, f"rm {temp_vps_path}", f"Removendo arquivo temporário {filename}")

        sftp.close()

        # Restart middleware container to apply updates and run DB schema check / seeding
        run(client, f"docker restart {container_name}", "Reiniciando o container de middleware")
        
        print("Aguardando 5 segundos para inicialização e execução de migrações...")
        time.sleep(5)
        
        print(f"OK: Deploy para {env['name']} concluído com sucesso!")
        return True

    except Exception as e:
        print(f"Erro durante o deploy para {env['name']}: {e}")
        return False
    finally:
        client.close()

def main():
    success = True
    for env in ENVIRONMENTS:
        if not deploy_to_env(env):
            success = False
            
    if success:
        print("\n🎉 TODOS OS DEPLOYS CONCLUÍDOS COM SUCESSO!")
        sys.exit(0)
    else:
        print("\n⚠️ ALGUNS DEPLOYS FALHARAM OU APRESENTARAM ERROS.")
        sys.exit(1)

if __name__ == '__main__':
    main()

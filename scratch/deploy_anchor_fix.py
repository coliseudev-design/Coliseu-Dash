"""
Script de deploy direto: copia os arquivos corrigidos para o container do middleware
e faz restart para aplicar as mudancas.
"""
import paramiko
import os

SSH_HOST = '177.39.17.7'
SSH_USER = 'root'
SSH_PASS = '6EFBC!c0:wzr%Ij'
MW_CONTAINER = 'dashboard-middleware-irerzifjwjb4q8ucbpfk2gb8-182151991845'

BASE = '/Users/kleber/Documents/GitHub/Coliseu-Dash/middleware/src/routes'
FILES = [
    'estatisticas.js',
    'ranking.js',
    'vendas.js',
    'clientes.js',
]

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(SSH_HOST, username=SSH_USER, password=SSH_PASS, timeout=20)

sftp = client.open_sftp()

print("=== Copiando arquivos corrigidos para o container ===")
for fname in FILES:
    local_path = os.path.join(BASE, fname)
    tmp_path = f'/tmp/{fname}'
    remote_path = f'/usr/src/app/src/routes/{fname}'
    
    # Upload para /tmp no host
    sftp.put(local_path, tmp_path)
    print(f"  Upload {fname} -> host:/tmp/{fname}")
    
    # Copiar do host para dentro do container
    stdin, stdout, stderr = client.exec_command(
        f'docker cp {tmp_path} {MW_CONTAINER}:{remote_path}', timeout=15
    )
    out = stdout.read().decode()
    err = stderr.read().decode()
    if err.strip():
        print(f"  ERRO ao copiar {fname}: {err.strip()}")
    else:
        print(f"  OK: {fname} -> container:{remote_path}")

sftp.close()

print("\n=== Reiniciando o middleware ===")
stdin, stdout, stderr = client.exec_command(
    f'docker exec {MW_CONTAINER} node -e "process.kill(1, \'SIGTERM\')" 2>&1 || docker restart {MW_CONTAINER} 2>&1',
    timeout=30
)
print(stdout.read().decode())
print(stderr.read().decode())

# Aguardar um pouco e verificar se ainda esta rodando
import time
time.sleep(5)

stdin, stdout, stderr = client.exec_command(
    f'docker ps --filter name={MW_CONTAINER} --format "{{{{.Status}}}}"',
    timeout=10
)
status = stdout.read().decode().strip()
print(f"\nStatus do container: {status}")

# Testar health
stdin, stdout, stderr = client.exec_command(
    f'curl -s http://127.0.0.1:33855/health/liveness 2>&1',
    timeout=10
)
print(f"Health check: {stdout.read().decode()}")

client.close()
print("\n=== Deploy concluido ===")

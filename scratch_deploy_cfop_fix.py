"""
Deploy da correção do cfop.js para o middleware de produção no VPS.
Copia o arquivo e reinicia o container do middleware.
"""
import paramiko, subprocess, time

HOST = '2.24.82.19'
USER = 'root'
PASS = 'Col@13894645'
MW_CONTAINER = 'dashboard-middleware-g115wwb76cltjli9wew0cgfi-184215157942'

# 1. Copiar o arquivo cfop.js para o VPS
print("📁 Copiando cfop.js para o VPS...")
result = subprocess.run([
    'sshpass', '-p', PASS, 'scp',
    '-o', 'StrictHostKeyChecking=no',
    '/Users/kleber/Documents/GitHub/Coliseu-Dash/middleware/src/utils/cfop.js',
    f'{USER}@{HOST}:/tmp/cfop.js'
], capture_output=True, text=True)
print(result.stdout, result.stderr)

# 2. Conectar SSH
client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PASS, timeout=20)

def run(client, cmd, desc=""):
    if desc: print(f"\n→ {desc}")
    _, stdout, stderr = client.exec_command(cmd)
    out = stdout.read().decode('utf-8')
    err = stderr.read().decode('utf-8')
    if out: print(out)
    if err and 'WARN' not in err: print("ERR:", err)
    return out

# 3. Copiar do VPS para o container
run(client, f"docker cp /tmp/cfop.js {MW_CONTAINER}:/app/src/utils/cfop.js", "Copiando cfop.js para o container middleware")

# 4. Reiniciar o container para aplicar as mudanças
run(client, f"docker restart {MW_CONTAINER}", "Reiniciando middleware container")

time.sleep(8)

# 5. Verificar logs para confirmar que o container subiu
run(client, f"docker logs --tail 20 {MW_CONTAINER}", "Verificando logs do middleware")

client.close()
print("\n✅ Deploy concluído!")

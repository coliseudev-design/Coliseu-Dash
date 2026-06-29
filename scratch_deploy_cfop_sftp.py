"""
Deploy da correção do cfop.js via paramiko (sem sshpass) - copia o conteúdo do arquivo diretamente.
"""
import paramiko, time

HOST = '2.24.82.19'
USER = 'root'
PASS = 'Col@13894645'
MW_CONTAINER = 'dashboard-middleware-g115wwb76cltjli9wew0cgfi-184215157942'

# Ler o conteúdo do arquivo local
with open('/Users/kleber/Documents/GitHub/Coliseu-Dash/middleware/src/utils/cfop.js', 'r') as f:
    cfop_content = f.read()

# Escapar para uso em here-doc
cfop_escaped = cfop_content.replace("'", "'\\''")

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

# 1. Usar SFTP para copiar o arquivo diretamente
print("📁 Enviando cfop.js via SFTP...")
sftp = client.open_sftp()
sftp.put('/Users/kleber/Documents/GitHub/Coliseu-Dash/middleware/src/utils/cfop.js', '/tmp/cfop_new.js')
sftp.close()
print("✅ Arquivo enviado!")

# 2. Verificar o conteúdo enviado
run(client, "head -20 /tmp/cfop_new.js", "Conferindo início do arquivo no VPS")

# 3. Copiar do VPS para dentro do container
run(client, f"docker cp /tmp/cfop_new.js {MW_CONTAINER}:/app/src/utils/cfop.js", "Copiando para o container")

# 4. Verificar dentro do container
run(client, f"docker exec {MW_CONTAINER} head -20 /app/src/utils/cfop.js", "Verificando arquivo no container")

# 5. Reiniciar o container
run(client, f"docker restart {MW_CONTAINER}", "Reiniciando container do middleware")

print("⏳ Aguardando container iniciar...")
time.sleep(10)

# 6. Verificar logs
run(client, f"docker logs --tail 20 {MW_CONTAINER}", "Logs do middleware após restart")

client.close()
print("\n✅ Deploy concluído!")

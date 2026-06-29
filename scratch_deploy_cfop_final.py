"""
Deploy definitivo do cfop.js corrigido - path /usr/src/app/src/utils/cfop.js
"""
import paramiko, time

HOST = '2.24.82.19'
USER = 'root'
PASS = 'Col@13894645'
MW_CONTAINER = 'dashboard-middleware-g115wwb76cltjli9wew0cgfi-184215157942'
CFOP_PATH = '/usr/src/app/src/utils/cfop.js'

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PASS, timeout=20)

def run(client, cmd, desc=""):
    if desc: print(f"\n→ {desc}")
    _, stdout, stderr = client.exec_command(cmd)
    out = stdout.read().decode('utf-8')
    err = stderr.read().decode('utf-8')
    if out: print(out)
    if err and 'WARN' not in err and 'level' not in err: print("ERR:", err)
    return out

# 1. Enviar via SFTP
print("📁 Enviando cfop.js via SFTP para /tmp...")
sftp = client.open_sftp()
sftp.put('/Users/kleber/Documents/GitHub/Coliseu-Dash/middleware/src/utils/cfop.js', '/tmp/cfop_new.js')
sftp.close()
print("✅ Arquivo enviado!")

# 2. Verificar o arquivo enviado (buscar a linha da correção)
run(client, "grep 'DEVOLUCAO' /tmp/cfop_new.js", "Verificando correção no arquivo enviado")

# 3. Backup do original no container
run(client, f"docker exec {MW_CONTAINER} cp {CFOP_PATH} {CFOP_PATH}.bak", "Backup do cfop.js original")

# 4. Copiar novo arquivo para o container
run(client, f"docker cp /tmp/cfop_new.js {MW_CONTAINER}:{CFOP_PATH}", "Copiando cfop.js corrigido para o container")

# 5. Verificar no container
run(client, f"docker exec {MW_CONTAINER} grep 'DEVOLUCAO' {CFOP_PATH}", "Verificando correção no container")

# 6. Reiniciar o container
run(client, f"docker restart {MW_CONTAINER}", "Reiniciando middleware container")

print("⏳ Aguardando container iniciar (12s)...")
time.sleep(12)

# 7. Verificar logs
out = run(client, f"docker logs --tail 10 {MW_CONTAINER}", "Logs do middleware após restart")

if 'rodando na porta' in out:
    print("\n🎉 Deploy bem-sucedido! Middleware está online.")
else:
    print("\n⚠️ Verificar manualmente — container pode não ter subido corretamente.")

client.close()

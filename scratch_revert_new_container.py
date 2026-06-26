"""
Reversão urgente no novo container do middleware.
"""
import paramiko, time

HOST = '2.24.82.19'
USER = 'root'
PASS = 'Col@13894645'
MW_CONTAINER = 'dashboard-middleware-g115wwb76cltjli9wew0cgfi-192717627336'
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
    if err and 'level' not in err: print("ERR:", err)
    return out

# 1. Verificar o filtro atual NO container novo
print("=== VERIFICANDO FILTRO ATUAL NO CONTAINER NOVO ===")
run(client, f"docker exec {MW_CONTAINER} grep 'getStatusFilter' -A2 {CFOP_PATH}", "Filtro atual no container")

# Se já tiver o NOT IN (filtro errado), precisamos corrigir
current = run(client, f"docker exec {MW_CONTAINER} grep 'NOT IN' {CFOP_PATH} || echo 'SEM_NOT_IN'", "Verificando se tem NOT IN")

if 'NOT IN' in current:
    print("\n⚠️  Container tem o filtro ERRADO (NOT IN). Corrigindo...")
    # Enviar via SFTP e copiar
    sftp = client.open_sftp()
    sftp.put('/Users/kleber/Documents/GitHub/Coliseu-Dash/middleware/src/utils/cfop.js', '/tmp/cfop_correct.js')
    sftp.close()
    run(client, f"docker cp /tmp/cfop_correct.js {MW_CONTAINER}:{CFOP_PATH}", "Copiando cfop.js original para o container")
    run(client, f"docker restart {MW_CONTAINER}", "Reiniciando container")
    time.sleep(12)
    run(client, f"docker logs --tail 5 {MW_CONTAINER}", "Logs após restart")
else:
    print("\n✅ Container JÁ TEM o filtro CORRETO (original). Nenhuma ação necessária.")

# 2. Confirmação final
run(client, f"docker exec {MW_CONTAINER} grep 'getStatusFilterClause' -A3 {CFOP_PATH}", "Filtro final no container")

client.close()
print("\n✅ Verificação/Reversão concluída!")

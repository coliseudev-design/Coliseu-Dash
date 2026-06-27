"""
Deploy das correções do Financeiro:
1. middleware/src/routes/financeiro.js - endpoint /contas agora respeita period + caixa_id
2. frontend/src/pages/Financeiro.tsx - removidas colunas de contas pagas/recebidas
"""
import paramiko, time

HOST = '2.24.82.19'
USER = 'root'
PASS = 'Col@13894645'
MW_CONTAINER = 'dashboard-middleware-g115wwb76cltjli9wew0cgfi-192717627336'

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PASS, timeout=20)

def run(client, cmd, desc=""):
    if desc: print(f"\n→ {desc}")
    _, stdout, stderr = client.exec_command(cmd)
    out = stdout.read().decode('utf-8')
    err = stderr.read().decode('utf-8')
    if out: print(out)
    if err and 'level' not in err and 'warn' not in err.lower(): print("ERR:", err[:200])
    return out

sftp = client.open_sftp()

# 1. Deploy do middleware (financeiro.js corrigido)
print("=== DEPLOY MIDDLEWARE: financeiro.js ===")
sftp.put(
    '/Users/kleber/Documents/GitHub/Coliseu-Dash/middleware/src/routes/financeiro.js',
    '/tmp/financeiro_fixed.js'
)
run(client, f"docker cp /tmp/financeiro_fixed.js {MW_CONTAINER}:/usr/src/app/src/routes/financeiro.js", "Copiando financeiro.js para container")
run(client, f"docker restart {MW_CONTAINER}", "Reiniciando middleware")
time.sleep(12)
run(client, f"docker logs --tail 5 {MW_CONTAINER}", "Logs do middleware após restart")

# 2. Build do frontend
print("\n=== BUILD DO FRONTEND ===")
sftp.close()
client.close()
print("✅ Deploy do middleware concluído. Agora fazer build do frontend localmente.")

"""
Encontrar o caminho correto do cfop.js dentro do container middleware e fazer o deploy.
"""
import paramiko, time

HOST = '2.24.82.19'
USER = 'root'
PASS = 'Col@13894645'
MW_CONTAINER = 'dashboard-middleware-g115wwb76cltjli9wew0cgfi-184215157942'

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

# 1. Encontrar cfop.js no container
run(client, f"docker exec {MW_CONTAINER} find / -name 'cfop.js' 2>/dev/null", "Encontrando cfop.js no container")

client.close()

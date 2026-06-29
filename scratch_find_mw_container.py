"""
Encontrar o novo container do middleware e fazer a reversão nele.
"""
import paramiko, time

HOST = '2.24.82.19'
USER = 'root'
PASS = 'Col@13894645'

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

# Listar todos os containers rodando
run(client, "docker ps --format '{{.Names}}' | grep middleware", "Containers middleware ativos")
run(client, "docker ps --format '{{.Names}}' | grep dashboard", "Containers dashboard ativos")
run(client, "docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'", "Todos os containers")

client.close()

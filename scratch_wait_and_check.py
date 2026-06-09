import time
import os
import sys
import paramiko

sys.stdout.reconfigure(encoding='utf-8')

print("Waiting 60 seconds for the next sync cycle...")
time.sleep(60)

print("\n=== TAIL OF WORKER LOG ===")
log_file = r"C:\Windows\System32\logs\worker-20260609.log"
if os.path.exists(log_file):
    with open(log_file, "r", encoding="utf-8", errors="ignore") as f:
        lines = f.readlines()
        for line in lines[-40:]:
            print(line.strip())

print("\n=== CONTAINER LOGS ===")
client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('2.24.82.19', username='root', password='Col@13894645', timeout=10)

stdin, stdout, stderr = client.exec_command("docker ps --format '{{.Names}}' | grep 'dashboard-middleware'")
container_name = stdout.read().decode('utf-8').strip().split('\n')[0]
if container_name:
    cmd = f"docker logs --tail 40 {container_name}"
    stdin, stdout, stderr = client.exec_command(cmd)
    print(stdout.read().decode('utf-8', errors='replace'))
    
    print("\n=== ROW COUNTS FOR PIVETA DIST IN PG ===")
    tenant = '1e40d65f-4319-4c68-ae13-66223820c095'
    sql = f"SELECT '{tenant}' as tenant, 'dash_clientes' as table_name, COUNT(*) FROM dash_clientes WHERE tenant_id = '{tenant}' UNION ALL SELECT '{tenant}', 'dash_vendas', COUNT(*) FROM dash_vendas WHERE tenant_id = '{tenant}' UNION ALL SELECT '{tenant}', 'dash_vendas_itens', COUNT(*) FROM dash_vendas_itens WHERE tenant_id = '{tenant}'"
    cmd = f"docker exec vasjsucz4yxcb7m4rtqindd2 psql -U coliseu_admin -d coliseu_dashboard -c \"{sql}\""
    stdin, stdout, stderr = client.exec_command(cmd)
    print(stdout.read().decode('utf-8'))
else:
    print("Container not found.")

client.close()


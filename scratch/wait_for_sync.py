import paramiko
import time
import sys

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
try:
    client.connect('2.24.82.19', username='root', password='Col@13894645', timeout=5)
except Exception as e:
    print(f"SSH Connection failed: {e}")
    sys.exit(1)

def run_sql(sql):
    cmd = f'docker exec vasjsucz4yxcb7m4rtqindd2 psql -U coliseu_admin -d coliseu_dashboard -t -c "{sql}"'
    stdin, stdout, stderr = client.exec_command(cmd)
    return stdout.read().decode('utf-8').strip()

print("Iniciando monitoramento da sincronização...")
start_time = time.time()
synced = False

for i in range(12): # 120 segundos max
    # Query current sync metadata
    meta = run_sql("SELECT ultima_sincronizacao FROM dash_sync_metadata WHERE tenant_id = 'ce3067f6-04a3-4b6c-a1b8-6aa47f24aad6' AND tabela = 'dash_vendas';")
    print(f"[{i*10}s] Última sincronização gravada no banco: {meta}")
    
    if meta and not meta.startswith('2026-06-01'):
        synced = True
        break
        
    time.sleep(10)

if synced:
    print("\nSincronização executada pelo worker C#!")
else:
    print("\nTempo esgotado. Sincronização ainda não executada pelo worker ou metadata não atualizada.")

# Query final order values anyway
orders_query = """
SELECT id_firebird, numero_pedido, data_venda, valor_total, valor_custo, valor_desconto, status
FROM dash_vendas
WHERE tenant_id = 'ce3067f6-04a3-4b6c-a1b8-6aa47f24aad6' AND id_firebird IN ('20193', '20192', '20191', '20187')
ORDER BY id_firebird DESC;
"""
print("\n=== Valores Atuais no Banco de Dados ===")
cmd = f'docker exec vasjsucz4yxcb7m4rtqindd2 psql -U coliseu_admin -d coliseu_dashboard -c "{orders_query}"'
stdin, stdout, _ = client.exec_command(cmd)
print(stdout.read().decode('utf-8'))

# Check last 5 middleware log lines for sync logs
stdin, stdout, _ = client.exec_command("docker ps --format '{{.Names}}' | grep dashboard-middleware")
container_name = stdout.read().decode('utf-8').strip().split('\n')[0]
if container_name:
    print(f"\n=== Logs Recentes de Ingestão ({container_name}) ===")
    stdin, stdout, _ = client.exec_command(f"docker logs --tail 20 {container_name} 2>&1 | grep -E 'SyncDebug|/api/sync'")
    print(stdout.read().decode('utf-8'))

client.close()

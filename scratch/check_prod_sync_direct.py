import paramiko
import sys

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
try:
    client.connect('2.24.82.19', username='root', password='Col@13894645', timeout=5)
except Exception as e:
    print(f"SSH Connection failed: {e}")
    sys.exit(1)

# Find middleware container dynamically
stdin, stdout, stderr = client.exec_command("docker ps --format '{{.Names}}' | grep dashboard-middleware")
container_name = stdout.read().decode('utf-8').strip().split('\n')[0]
print(f"Container ativo encontrado: {container_name}")

def run_query(sql, label):
    cmd = f'docker exec vasjsucz4yxcb7m4rtqindd2 psql -U coliseu_admin -d coliseu_dashboard -c "{sql}"'
    stdin, stdout, stderr = client.exec_command(cmd, timeout=10)
    out = stdout.read().decode('utf-8')
    err = stderr.read().decode('utf-8')
    print(f"\n=== {label} ===")
    if out.strip():
        print(out)
    if err.strip():
        print("ERR:", err)

# 1. Sync metadata status
run_query(
    "SELECT tabela, ultima_sincronizacao, status, registros_sincronizados FROM dash_sync_metadata WHERE tenant_id = 'ce3067f6-04a3-4b6c-a1b8-6aa47f24aad6' AND tabela IN ('dash_vendas', 'dash_vendas_itens', '__heartbeat__') ORDER BY tabela;",
    "Status de Sincronização (Metadata)"
)

# 2. Values of our target orders
run_query(
    "SELECT id_firebird, numero_pedido, data_venda, valor_total, valor_custo, valor_desconto, status FROM dash_vendas WHERE tenant_id = 'ce3067f6-04a3-4b6c-a1b8-6aa47f24aad6' AND id_firebird IN ('20193', '20192', '20191', '20187') ORDER BY id_firebird DESC;",
    "Valores das Vendas no Banco de Dados"
)

# 3. Last 20 middleware log lines
if container_name:
    cmd_logs = f"docker logs --tail 25 {container_name} 2>&1"
    stdin, stdout, stderr = client.exec_command(cmd_logs)
    print("\n=== Últimos Logs do Middleware ===")
    print(stdout.read().decode('utf-8'))

client.close()

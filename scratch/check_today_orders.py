import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('2.24.82.19', username='root', password='Col@13894645', timeout=10)

DB = "vasjsucz4yxcb7m4rtqindd2"

def pg(database, sql, label):
    sql_escaped = sql.replace('"', '\\"')
    cmd = f'docker exec {DB} psql -U coliseu_admin -d {database} -c "{sql_escaped}" 2>&1'
    stdin, stdout, stderr = client.exec_command(cmd)
    print(f"\n=== {label} ({database}) ===")
    print(stdout.read().decode('utf-8'))

pg(
    "coliseu_dashboard",
    "SELECT id_firebird, numero_pedido, data_venda, valor_total, valor_desconto, status, tenant_id FROM dash_vendas WHERE data_venda >= '2026-06-11 00:00:00' OR sincronizado_em >= '2026-06-11 00:00:00' ORDER BY sincronizado_em DESC LIMIT 20;",
    "Pedidos de hoje no PG"
)

client.close()

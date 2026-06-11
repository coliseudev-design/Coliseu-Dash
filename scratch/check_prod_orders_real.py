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
    "SELECT id_firebird, numero_pedido, data_venda, valor_total, valor_desconto, status, tenant_id FROM dash_vendas WHERE numero_pedido IN ('7473', '7472', '7471', '7467') ORDER BY numero_pedido DESC;",
    "Pedidos na coliseu_dashboard (dash_vendas)"
)

pg(
    "coliseu_dashboard",
    "SELECT venda_id_firebird, produto_id_firebird, quantidade, preco_unitario, valor_total, produto FROM dash_vendas_itens WHERE venda_id_firebird IN (SELECT id_firebird FROM dash_vendas WHERE numero_pedido IN ('7473', '7472', '7471', '7467')) ORDER BY venda_id_firebird DESC;",
    "Itens na coliseu_dashboard (dash_vendas_itens)"
)

client.close()

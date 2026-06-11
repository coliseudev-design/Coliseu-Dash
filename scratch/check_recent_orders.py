import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('177.39.17.7', username='root', password='6EFBC!c0:wzr%Ij')

DB = "coliseu-db-thyqkc5gkvp7i1nld555wakz-172547374937"

def pg(sql, label):
    sql_escaped = sql.replace('"', '\\"')
    cmd = f'docker exec {DB} psql -U coliseu_admin -d coliseu_dashboard -c "{sql_escaped}" 2>&1'
    stdin, stdout, stderr = client.exec_command(cmd)
    print(f"\n=== {label} ===")
    print(stdout.read().decode('utf-8'))

# Query the specific orders
pg(
    "SELECT id_firebird, numero_pedido, data_venda, valor_total, valor_desconto, status, sincronizado_em FROM dash_vendas WHERE numero_pedido IN ('7473', '7472', '7471', '7467') ORDER BY numero_pedido DESC;",
    "Pedidos recentes no PG (dash_vendas)"
)

# Query the items for these orders
pg(
    "SELECT venda_id_firebird, produto_id_firebird, quantidade, preco_unitario, valor_total, produto FROM dash_vendas_itens WHERE venda_id_firebird IN (SELECT id_firebird FROM dash_vendas WHERE numero_pedido IN ('7473', '7472', '7471', '7467')) ORDER BY venda_id_firebird DESC;",
    "Itens dos pedidos no PG (dash_vendas_itens)"
)

client.close()

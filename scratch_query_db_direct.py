import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('177.39.17.7', username='root', password='6EFBC!c0:wzr%Ij')

DB_CONTAINER = "coliseu-db-thyqkc5gkvp7i1nld555wakz-172547374937"

def run_query(sql, label):
    cmd = f'docker exec {DB_CONTAINER} psql -U coliseu_admin -d coliseu_dashboard -c "{sql}"'
    stdin, stdout, stderr = client.exec_command(cmd)
    print(f"=== {label} ===")
    print(stdout.read().decode('utf-8'))
    err = stderr.read().decode('utf-8')
    if err:
        print(f"ERR ({label}): {err}")

# 1. Search for clients matching '%KLEBER%' case-insensitive
run_query("SELECT tenant_id, id_firebird, nome, documento FROM dash_clientes WHERE nome ILIKE '%kleber%' LIMIT 10;", "Clients matching Kleber")

# 2. Search for recent sales (last 30 sales)
run_query("SELECT tenant_id, id_firebird, numero_pedido, data_venda, data_vencimento, cliente_id_firebird, valor_total, status FROM dash_vendas ORDER BY id_firebird DESC LIMIT 30;", "Last 30 Sales by id_firebird")

# 3. Search for any sales with data_vencimento on 26/05
run_query("SELECT tenant_id, id_firebird, numero_pedido, data_venda, data_vencimento, cliente_id_firebird, valor_total, status FROM dash_vendas WHERE data_vencimento::date = '2026-05-26';", "Sales faturadas on 2026-05-26")

# 4. Search for sales with data_venda on 2026-05-26
run_query("SELECT tenant_id, id_firebird, numero_pedido, data_venda, data_vencimento, cliente_id_firebird, valor_total, status FROM dash_vendas WHERE data_venda::date = '2026-05-26';", "Sales with data_venda on 2026-05-26")

# 5. Search for sales with data_venda on 2026-05-01
run_query("SELECT tenant_id, id_firebird, numero_pedido, data_venda, data_vencimento, cliente_id_firebird, valor_total, status FROM dash_vendas WHERE data_venda::date = '2026-05-01';", "Sales with data_venda on 2026-05-01")

client.close()

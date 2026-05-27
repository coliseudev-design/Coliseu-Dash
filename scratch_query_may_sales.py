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

# 1. Search for any client matching '%DIAGONE%' or '%KLEBER%'
run_query("SELECT id_firebird, nome, documento FROM dash_clientes WHERE nome ILIKE '%diagone%' OR nome ILIKE '%kleber%';", "Clients matching DIAGONE or KLEBER")

# 2. Search for any sales with data_venda in May 2026
run_query("SELECT COUNT(*), MIN(data_venda), MAX(data_venda) FROM dash_vendas WHERE data_venda >= '2026-05-01' AND data_venda < '2026-06-01';", "Sales Count in May 2026")

# 3. Top 30 recent sales by data_venda descending
run_query("SELECT id_firebird, numero_pedido, data_venda, data_vencimento, cliente_id_firebird, valor_total, status FROM dash_vendas WHERE data_venda IS NOT NULL ORDER BY data_venda DESC LIMIT 30;", "Top 30 Recent Sales by data_venda DESC")

# 4. Search for sales with number_pedido similar to what we expect, or any sale with value 2400 or near
run_query("SELECT id_firebird, numero_pedido, data_venda, data_vencimento, valor_total, status FROM dash_vendas WHERE valor_total = 2400 OR valor_total = 0 LIMIT 10;", "Sales with valor_total = 2400 or 0")

client.close()

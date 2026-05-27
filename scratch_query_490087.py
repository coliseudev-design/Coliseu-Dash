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

run_query("SELECT id_firebird, numero_pedido, data_venda, data_vencimento, cliente_id_firebird, valor_total, status FROM dash_vendas WHERE id_firebird BETWEEN 490080 AND 490090;", "Sales with id_firebird in range 490080-490090")
run_query("SELECT id_firebird, numero_pedido, data_venda, data_vencimento, cliente_id_firebird, valor_total, status FROM dash_vendas WHERE numero_pedido IN ('490080', '490081', '490082', '490083', '490084', '490085', '490086', '490087', '490088', '490089', '490090');", "Sales with numero_pedido in range 490080-490090")

client.close()

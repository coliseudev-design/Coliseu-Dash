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

run_query("SELECT id_firebird, numero_pedido, data_venda, data_vencimento, cliente_id_firebird, valor_total, status FROM dash_vendas WHERE EXTRACT(DAY FROM data_venda) = 1 AND data_venda >= '2026-01-01' ORDER BY data_venda DESC LIMIT 30;", "Sales on Day 01 of any month in 2026")

client.close()

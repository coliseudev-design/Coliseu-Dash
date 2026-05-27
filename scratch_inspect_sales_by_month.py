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

# Query sales by month for 2026
run_query("SELECT EXTRACT(MONTH FROM data_venda) as mes, COUNT(*), MIN(data_venda), MAX(data_venda) FROM dash_vendas WHERE data_venda >= '2026-01-01' GROUP BY 1 ORDER BY 1;", "Sales by month in 2026")

# Query sales where number of order is similar to Kleber's order if we know it (e.g. from git history or similar files)
# Wait, let's search in all dash_vendas for "4900" or similar. Let's do a wildcard search.
run_query("SELECT id_firebird, numero_pedido, data_venda, data_vencimento, valor_total, status FROM dash_vendas WHERE numero_pedido LIKE '%4900%';", "Orders containing 4900")

client.close()

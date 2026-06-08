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

run_query(
    "SELECT id_firebird, numero_pedido, data_venda, data_vencimento, valor_total, status, cfop FROM dash_vendas WHERE tenant_id = '816f97c4-66fb-4ef8-905d-e0551cbf2492' ORDER BY id_firebird DESC;",
    "All sales for 816f97c4"
)

client.close()

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

# Query recent sales for any tenant
run_query(
    "SELECT tenant_id, id_firebird, numero_pedido, data_venda, data_vencimento, valor_total, TRIM(status) as status, cfop FROM dash_vendas WHERE data_venda >= '2026-05-25' ORDER BY data_venda ASC;",
    "Vendas a partir de 25/05/2026 no VPS"
)

client.close()

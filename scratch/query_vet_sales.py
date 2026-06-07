import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('177.39.17.7', username='root', password='6EFBC!c0:wzr%Ij')

DB_CONTAINER = "coliseu-db-thyqkc5gkvp7i1nld555wakz-172547374937"

def run_query(sql, label):
    cmd = f'docker exec {DB_CONTAINER} psql -U coliseu_admin -d coliseu_dashboard_vet -c "{sql}"'
    stdin, stdout, stderr = client.exec_command(cmd)
    print(f"=== {label} ===")
    print(stdout.read().decode('utf-8'))

# List tenants in coliseu_dashboard_vet
run_query("SELECT DISTINCT tenant_id FROM dash_vendas;", "Distinct Tenants in VET")

# Query recent sales
run_query(
    "SELECT id_firebird, numero_pedido, data_venda, data_vencimento, valor_total, status, sincronizado_em FROM dash_vendas ORDER BY data_venda DESC LIMIT 15;",
    "Recent sales in VET database"
)

# Query specific orders
run_query(
    "SELECT id_firebird, numero_pedido, data_venda, valor_total, status FROM dash_vendas WHERE id_firebird IN (514593, 514592, 514589, 514590, 514588, 514587, 514583);",
    "Specific orders in VET database"
)

client.close()

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

# Query clients for tenant 'c06a45f5-fd16-4f8c-92b6-af73c00ca278'
run_query("SELECT id_firebird, nome, documento FROM dash_clientes WHERE tenant_id = 'c06a45f5-fd16-4f8c-92b6-af73c00ca278';", "Clients for tenant three")

# Query sales for tenant 'c06a45f5-fd16-4f8c-92b6-af73c00ca278'
run_query("SELECT id_firebird, numero_pedido, data_venda, valor_total, status FROM dash_vendas WHERE tenant_id = 'c06a45f5-fd16-4f8c-92b6-af73c00ca278';", "Sales for tenant three")

client.close()

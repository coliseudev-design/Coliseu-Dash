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

run_query("SELECT tenant_id, COUNT(*), MIN(data_venda), MAX(data_venda) FROM dash_vendas GROUP BY tenant_id;", "Vendas por Tenant")
run_query("SELECT DISTINCT cfop FROM dash_vendas LIMIT 50;", "Distinct CFOPs na base")
run_query("SELECT tenant_id, status, COUNT(*) FROM dash_vendas GROUP BY tenant_id, status;", "Vendas por Tenant e Status (não trimado)")

client.close()

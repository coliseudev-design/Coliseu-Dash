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

run_query("SELECT COUNT(*), SUM(valor_total) FROM dash_vendas WHERE valor_total < 0;", "Total Negative Sales in DB")
run_query("SELECT tenant_id, COUNT(*), SUM(valor_total) FROM dash_vendas WHERE valor_total < 0 GROUP BY tenant_id;", "Negative Sales by Tenant")
run_query("SELECT id_firebird, tenant_id, data_venda::text, valor_total, status, cfop FROM dash_vendas WHERE valor_total < 0 LIMIT 20;", "Sample Negative Sales")

client.close()

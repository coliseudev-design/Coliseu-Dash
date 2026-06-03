import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('177.39.17.7', username='root', password='6EFBC!c0:wzr%Ij')

DB_CONTAINER = 'coliseu-db-thyqkc5gkvp7i1nld555wakz-172547374937'

def run_query(sql, label):
    cmd = f'docker exec {DB_CONTAINER} psql -U coliseu_admin -d coliseu_dashboard_vet -c "{sql}"'
    stdin, stdout, stderr = client.exec_command(cmd)
    print(f"\n=== {label} ===")
    print(stdout.read().decode('utf-8'))
    err = stderr.read().decode('utf-8')
    if err:
        print("ERR:", err)

# Query unique status values
run_query("SELECT status, COUNT(*) FROM dash_vendas GROUP BY status ORDER BY 2 DESC LIMIT 20;", "STATUS IN SALES")

# Query last 10 sales
run_query("SELECT tenant_id, data_venda, valor_total, status, cfop FROM dash_vendas ORDER BY data_venda DESC LIMIT 10;", "LAST 10 SALES")

# Query sales counts grouped by tenant, status and month
run_query("SELECT tenant_id, TRIM(status) as trim_status, COUNT(*) FROM dash_vendas GROUP BY 1, 2 ORDER BY 3 DESC LIMIT 20;", "TENANT STATUS GROUPING")

client.close()

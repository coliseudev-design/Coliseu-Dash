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

run_query("""
    SELECT 'dash_vendas' as tbl, COUNT(*) FROM dash_vendas WHERE valor_total BETWEEN 7118820 AND 7118828;
""", "Direct check on sales total")

run_query("""
    SELECT 
        tenant_id, 
        SUM(valor_total) as sum_total 
    FROM dash_vendas 
    GROUP BY tenant_id;
""", "Sums of valor_total per tenant (all statuses)")

run_query("""
    SELECT 
        tenant_id, 
        status, 
        SUM(valor_total) as sum_total 
    FROM dash_vendas 
    WHERE data_venda >= '2026-05-01' AND data_venda <= '2026-05-31'
    GROUP BY tenant_id, status;
""", "Sales in May 2026")

client.close()

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

# Try to find what filters give count = 1378 or total faturamento = 7118824.16 for tenant a822a7e7
run_query("""
    SELECT 
        TRIM(status) as status,
        COUNT(*) as count,
        SUM(valor_total) as sum_total
    FROM dash_vendas
    WHERE tenant_id = 'a822a7e7-fdd4-4483-bbb5-26587a72739f'
    GROUP BY TRIM(status);
""", "Statuses for a822a7e7")

# Try to find what filters give count = 1378 or total faturamento = 7118824.16 for tenant ed1d3a98
run_query("""
    SELECT 
        TRIM(status) as status,
        COUNT(*) as count,
        SUM(valor_total) as sum_total
    FROM dash_vendas
    WHERE tenant_id = 'ed1d3a98-4c4d-48db-99c0-8751926eb8e5'
    GROUP BY TRIM(status);
""", "Statuses for ed1d3a98")

# Let's inspect the last 10 sales of tenant a822a7e7
run_query("""
    SELECT id_firebird, data_venda, valor_total, status FROM dash_vendas WHERE tenant_id = 'a822a7e7-fdd4-4483-bbb5-26587a72739f' ORDER BY id_firebird DESC LIMIT 10;
""", "Last 10 sales for a822a7e7")

client.close()

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

# November and December 2025 monthly totals for both tenants
run_query("""
    SELECT 
        tenant_id,
        DATE_TRUNC('month', data_venda) as mes,
        COUNT(*) as count,
        SUM(valor_total) as sum_total
    FROM dash_vendas
    WHERE data_venda >= '2025-11-01' AND data_venda <= '2025-12-31'
    GROUP BY tenant_id, DATE_TRUNC('month', data_venda)
    ORDER BY tenant_id, mes;
""", "Vendas por Tenant e Mês (Nov-Dez 2025)")

client.close()

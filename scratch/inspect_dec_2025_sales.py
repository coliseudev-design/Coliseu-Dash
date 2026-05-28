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
    SELECT 
        tenant_id,
        SUM(valor_total) AS total_dec_2025,
        COUNT(*) AS count_dec_2025
    FROM dash_vendas
    WHERE TRIM(status) IN ('FATURADO', 'FINALIZADO')
      AND data_venda >= '2025-12-01' AND data_venda <= '2025-12-31'
    GROUP BY tenant_id;
""", "Vendas em Dezembro 2025")

run_query("""
    SELECT 
        tenant_id,
        SUM(valor_total) AS total_nov_2025,
        COUNT(*) AS count_nov_2025
    FROM dash_vendas
    WHERE TRIM(status) IN ('FATURADO', 'FINALIZADO')
      AND data_venda >= '2025-11-01' AND data_venda <= '2025-11-30'
    GROUP BY tenant_id;
""", "Vendas em Novembro 2025")

client.close()

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
        COALESCE(SUM(valor_total), 0) AS total,
        COUNT(*) AS count
    FROM dash_vendas
    WHERE TRIM(status) IN ('FATURADO', 'FINALIZADO')
      AND data_venda >= '2026-01-01 00:00:00'
      AND data_venda <= '2026-05-27 23:59:59'
    GROUP BY tenant_id;
""", "Sales from 2026-01-01 to 2026-05-27")

client.close()

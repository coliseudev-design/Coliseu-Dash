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
        COALESCE(SUM(valor_total), 0) AS total_faturado,
        COUNT(*) AS total_pedidos
    FROM dash_vendas
    WHERE TRIM(status) IN ('FATURADO', 'FINALIZADO')
    GROUP BY tenant_id;
""", "Faturamento Total (FATURADO/FINALIZADO)")

run_query("""
    SELECT 
        v.tenant_id,
        MIN(v.data_venda) as min_data,
        MAX(v.data_venda) as max_data
    FROM dash_vendas v
    GROUP BY v.tenant_id;
""", "Datas Limites por Tenant")

client.close()

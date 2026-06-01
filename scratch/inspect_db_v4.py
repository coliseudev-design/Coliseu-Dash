import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('177.39.17.7', username='root', password='6EFBC!c0:wzr%Ij')

DB = "coliseu-db-thyqkc5gkvp7i1nld555wakz-172547374937"

def pg(sql, label):
    cmd = f'docker exec {DB} psql -U coliseu_admin -d coliseu_dashboard -c "{sql}" 2>&1'
    stdin, stdout, stderr = client.exec_command(cmd)
    print(f"\n=== {label} ===")
    print(stdout.read().decode('utf-8'))

# Inspect seller sales summary in December 2025
pg(
    """
    SELECT 
        vendedor_id_firebird, 
        COUNT(*) as total_sales, 
        COUNT(DISTINCT cliente_id_firebird) as distinct_clients, 
        SUM(valor_total) as faturamento
    FROM dash_vendas 
    WHERE data_venda >= '2025-12-01' AND data_venda <= '2025-12-31'
    GROUP BY vendedor_id_firebird 
    ORDER BY faturamento DESC;
    """,
    "SELLER PERFORMANCE FOR DECEMBER 2025"
)



client.close()

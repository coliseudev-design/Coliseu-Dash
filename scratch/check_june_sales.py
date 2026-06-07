import paramiko
client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('177.39.17.7', username='root', password='6EFBC!c0:wzr%Ij')

def run_query(sql, db="coliseu_dashboard"):
    sql_escaped = sql.replace("'", "'\\''")
    cmd = f"docker exec coliseu-db-thyqkc5gkvp7i1nld555wakz-172547374937 psql -U coliseu_admin -d {db} -c '{sql_escaped}'"
    stdin, stdout, stderr = client.exec_command(cmd)
    print(f"=== Query ===")
    print(stdout.read().decode('utf-8'))

run_query("""
    SELECT 
        tenant_id, 
        date_trunc('day', data_venda) as dia, 
        SUM(valor_total) as total, 
        COUNT(*) as qtd 
    FROM dash_vendas 
    WHERE data_venda >= '2026-06-01' 
    GROUP BY tenant_id, date_trunc('day', data_venda) 
    ORDER BY tenant_id, dia
""")

client.close()

import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('177.39.17.7', username='root', password='6EFBC!c0:wzr%Ij')

DB_CONTAINER = "coliseu-db-thyqkc5gkvp7i1nld555wakz-172547374937"

def run_psql_file(db, sql):
    sftp = client.open_sftp()
    with sftp.open('/tmp/tmp_query.sql', 'w') as f:
        f.write(sql)
    sftp.close()
    
    cmd = (
        f"docker cp /tmp/tmp_query.sql {DB_CONTAINER}:/tmp/tmp_query.sql && "
        f"docker exec {DB_CONTAINER} psql -U coliseu_admin -d {db} -f /tmp/tmp_query.sql && "
        f"docker exec {DB_CONTAINER} rm /tmp/tmp_query.sql && "
        f"rm /tmp/tmp_query.sql"
    )
    stdin, stdout, stderr = client.exec_command(cmd)
    return stdout.read().decode('utf-8')

# Let's check all sales in Dec 2025 grouped by tenant, status and sum without timezone conversions
sql = """
SELECT tenant_id, data_venda::date, status, COUNT(*), SUM(valor_total)
FROM dash_vendas
WHERE data_venda >= '2025-12-01 00:00:00' AND data_venda <= '2025-12-31 23:59:59'
GROUP BY tenant_id, data_venda::date, status
ORDER BY tenant_id, data_venda::date;
"""
print(run_psql_file("coliseu_dashboard", sql))

client.close()

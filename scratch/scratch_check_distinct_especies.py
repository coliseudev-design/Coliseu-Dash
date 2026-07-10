import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('2.24.82.19', username='root', password='Col@13894645')

db_container = 'vasjsucz4yxcb7m4rtqindd2'

def run_query(db_name, sql):
    sql_escaped = sql.replace("'", "'\\''")
    cmd = f"docker exec {db_container} psql -U coliseu_admin -d {db_name} -c '{sql_escaped}' 2>&1"
    stdin, stdout, stderr = client.exec_command(cmd)
    out = stdout.read().decode('utf-8')
    return out

tenant_id = 'db05d98f-6939-4d80-af33-54cd91c35d7f'

print("=== DISTINCT ESPECIES IN June 2026 ===")
sql = f"""
SELECT 
    especie,
    SUM(valor_total - COALESCE(valor_desconto, 0)) AS total,
    COUNT(*) AS count
FROM dash_vendas 
WHERE tenant_id = '{tenant_id}'
  AND data_hora_proc >= '2026-06-01 00:00:00+00' AND data_hora_proc <= '2026-06-30 23:59:59+00'
GROUP BY especie
ORDER BY total DESC
"""
print(run_query("coliseu_dashboard", sql))

client.close()

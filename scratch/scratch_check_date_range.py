import paramiko
from datetime import datetime

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

tenant_id = 'ba7a5f04-a525-45fd-bacc-8011ed9486a1'

# July 1 to July 31 2026
# Let's run query 2 with parameters formatted as Date string vs timestamp
print("=== SQL Query 2 with timestamp format ===")
sql = f"""
SELECT COALESCE(SUM(v.valor_total - COALESCE(v.valor_desconto, 0)),0) AS total, COUNT(*) AS qtd 
FROM dash_vendas v 
WHERE v.tenant_id = '{tenant_id}' 
  AND v.data_hora_proc >= '2026-07-01 00:00:00+00' 
  AND v.data_hora_proc <= '2026-07-31 23:59:59.999+00' 
  AND TRIM(v.status) IN ('FATURADO', 'FINALIZADO', 'PROCESSADO')
  AND (v.depto_id = 1 OR v.depto_id IS NULL)
"""
print(run_query("coliseu_dashboard", sql))

client.close()

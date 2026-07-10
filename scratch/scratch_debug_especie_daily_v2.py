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
start_date = '2026-06-01'
end_date = '2026-06-30'

print("=== DAILY FATURAMENTO ON DASHBOARD (June 2026) ===")
sql = f"""
SELECT 
    date(data_hora_proc) as dia,
    COUNT(*) as qtd,
    SUM(valor_total - COALESCE(valor_desconto, 0)) as total
FROM dash_vendas 
WHERE tenant_id = '{tenant_id}'
  AND data_hora_proc >= '{start_date} 00:00:00+00' AND data_hora_proc <= '{end_date} 23:59:59.999+00'
  AND TRIM(status) IN ('FATURADO', 'FINALIZADO', 'PROCESSADO')
GROUP BY 1
ORDER BY dia
"""
print(run_query("coliseu_dashboard", sql))

client.close()

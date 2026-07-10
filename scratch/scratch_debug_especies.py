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
start_date = '2026-06-01 00:00:00+00'
end_date = '2026-06-30 23:59:59.999+00'

print("=== SPECIES BREAKDOWN IN JUNE 2026 ===")
sql = f"""
SELECT 
    COALESCE(especie, 'Não Informada') AS especie,
    SUM(valor_total) as raw_sum_header,
    SUM(valor_total - COALESCE(valor_desconto, 0)) as net_sum_header,
    SUM(CASE WHEN valor_total >= 0 THEN valor_total - COALESCE(valor_desconto, 0) ELSE 0 END) as positive_net_sum,
    SUM(CASE WHEN valor_total < 0 THEN valor_total - COALESCE(valor_desconto, 0) ELSE 0 END) as negative_net_sum,
    COUNT(*) as total_count,
    COUNT(CASE WHEN valor_total < 0 THEN 1 END) as return_count
FROM dash_vendas 
WHERE tenant_id = '{tenant_id}'
  AND data_hora_proc >= '{start_date}' AND data_hora_proc <= '{end_date}'
  AND TRIM(status) IN ('FATURADO', 'FINALIZADO', 'PROCESSADO')
GROUP BY 1
ORDER BY net_sum_header DESC
"""
print(run_query("coliseu_dashboard", sql))

client.close()

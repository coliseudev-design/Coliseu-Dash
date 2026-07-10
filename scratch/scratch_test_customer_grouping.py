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

print("=== NEW CUSTOMER RANKING (GROUPED BY NAME) ===")
sql = f"""
SELECT 
    COALESCE(c.nome, 'Cliente ' || COALESCE(v.cliente_id_firebird::text, '?')) AS nome,
    SUM(v.valor_total - COALESCE(v.valor_desconto, 0)) AS total,
    COUNT(DISTINCT v.id_firebird) AS qtd_pedidos
FROM dash_vendas v
LEFT JOIN dash_clientes c ON c.id_firebird = v.cliente_id_firebird AND c.tenant_id = v.tenant_id
WHERE v.tenant_id = '{tenant_id}' 
  AND v.data_hora_proc >= '{start_date}' AND v.data_hora_proc <= '{end_date}'
  AND TRIM(v.status) IN ('FATURADO', 'FINALIZADO', 'PROCESSADO')
GROUP BY COALESCE(c.nome, 'Cliente ' || COALESCE(v.cliente_id_firebird::text, '?'))
ORDER BY total DESC LIMIT 10
"""
print(run_query("coliseu_dashboard", sql))

client.close()

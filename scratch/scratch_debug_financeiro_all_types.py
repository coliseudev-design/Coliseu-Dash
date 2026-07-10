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

print("=== DISTINCT TIPO IN dash_financeiro ===")
sql = f"SELECT DISTINCT tipo, tipo_normalized FROM dash_financeiro WHERE tenant_id = '{tenant_id}'"
print(run_query("coliseu_dashboard", sql))

print("=== DISTINCT STATUS IN dash_financeiro ===")
sql = f"SELECT DISTINCT status_pagamento, status_pagamento_normalized FROM dash_financeiro WHERE tenant_id = '{tenant_id}'"
print(run_query("coliseu_dashboard", sql))

print("=== TRANSACTIONS FOR CAIXA 1 IN JUNE 2026 ===")
sql = f"""
SELECT 
    tipo, 
    status_pagamento, 
    COUNT(*), 
    SUM(valor) as sum_valor, 
    SUM(valor_pago) as sum_valor_pago
FROM dash_financeiro 
WHERE tenant_id = '{tenant_id}' 
  AND caixa_id_firebird = 1 
  AND COALESCE(data_pagamento, data_vencimento) >= '{start_date}'
  AND COALESCE(data_pagamento, data_vencimento) <= '{end_date}'
GROUP BY 1, 2
"""
print(run_query("coliseu_dashboard", sql))

client.close()

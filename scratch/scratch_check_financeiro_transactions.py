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
end_date = '2026-06-05 23:59:59.999+00'

print("=== TRANSACTIONS IN dash_financeiro FOR JUNE 1-5, 2026 (caixa_id=1) ===")
sql = f"""
SELECT 
    id,
    data_pagamento,
    data_vencimento,
    tipo,
    status_pagamento,
    valor,
    valor_pago,
    venda_id_firebird
FROM dash_financeiro 
WHERE tenant_id = '{tenant_id}'
  AND caixa_id_firebird = 1
  AND COALESCE(data_pagamento, data_vencimento) >= '{start_date}'
  AND COALESCE(data_pagamento, data_vencimento) <= '{end_date}'
ORDER BY COALESCE(data_pagamento, data_vencimento) ASC
"""
print(run_query("coliseu_dashboard", sql))

client.close()

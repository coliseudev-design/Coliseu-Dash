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

print("=== 1. TEST SPECIES QUERY WITH RAW COLUMNS ===")
sql = f"""
SELECT 
    TRIM(UPPER(COALESCE(v.especie, 'DINHEIRO'))) as nome_especie, 
    COALESCE(SUM(CASE WHEN TRIM(f.tipo) = 'RECEBER' THEN COALESCE(f.valor_pago, f.valor) ELSE -COALESCE(f.valor_pago, f.valor) END), 0) AS total_especie
FROM dash_financeiro f
LEFT JOIN dash_vendas v ON v.tenant_id = f.tenant_id AND v.id_firebird = f.venda_id_firebird
WHERE f.tenant_id = '{tenant_id}'
  AND TRIM(f.status_pagamento) = 'PAGO'
  AND COALESCE(f.data_pagamento, f.data_vencimento) >= '{start_date}' 
  AND COALESCE(f.data_pagamento, f.data_vencimento) <= '{end_date}'
  AND f.caixa_id_firebird = 1
GROUP BY 1
ORDER BY total_especie DESC
"""
print(run_query("coliseu_dashboard", sql))

client.close()

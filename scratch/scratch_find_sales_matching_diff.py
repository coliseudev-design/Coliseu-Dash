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

print("=== CHECKING FOR SALES AROUND R$ 2.674,00 ===")
sql = f"""
SELECT 
    id_firebird,
    numero_pedido,
    data_venda,
    data_hora_proc,
    valor_total,
    valor_desconto,
    (valor_total - COALESCE(valor_desconto, 0)) as valor_liquido,
    especie,
    status
FROM dash_vendas 
WHERE tenant_id = '{tenant_id}'
  AND data_hora_proc >= '{start_date}' AND data_hora_proc <= '{end_date}'
  AND abs((valor_total - COALESCE(valor_desconto, 0)) - 2674.00) < 10.00
"""
print(run_query("coliseu_dashboard", sql))

print("=== CHECKING FOR DEVOLUCOES OR SPECIFIC ENTRIES WITH R$ 2.674,00 ===")
sql = f"""
SELECT 
    id_firebird,
    venda_id_firebird,
    data_devolucao,
    valor
FROM dash_devolucoes
WHERE tenant_id = '{tenant_id}'
  AND data_devolucao >= '2026-06-01' AND data_devolucao <= '2026-06-30'
  AND abs(valor - 2674.00) < 10.00
"""
print(run_query("coliseu_dashboard", sql))

client.close()

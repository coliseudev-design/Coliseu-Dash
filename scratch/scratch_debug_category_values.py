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

print("=== 1. TOTAL SALES IN JUNE 2026 (Header) ===")
# Total faturado líquido (com desconto deduzido)
sql = f"""
SELECT 
    SUM(valor_total) as total_bruto,
    SUM(COALESCE(valor_desconto, 0)) as total_desconto,
    SUM(valor_total - COALESCE(valor_desconto, 0)) as total_liquido
FROM dash_vendas 
WHERE tenant_id = '{tenant_id}' 
  AND data_hora_proc >= '{start_date}' AND data_hora_proc <= '{end_date}'
  AND TRIM(status) IN ('FATURADO', 'FINALIZADO', 'PROCESSADO')
"""
print(run_query("coliseu_dashboard", sql))

print("=== 2. TOTAL ITEMS IN JUNE 2026 (Items) ===")
# Soma dos itens das mesmas vendas
sql = f"""
WITH vf AS (
    SELECT id_firebird
    FROM dash_vendas
    WHERE tenant_id = '{tenant_id}' 
      AND data_hora_proc >= '{start_date}' AND data_hora_proc <= '{end_date}'
      AND TRIM(status) IN ('FATURADO', 'FINALIZADO', 'PROCESSADO')
)
SELECT 
    SUM(vi.valor_total) as total_itens_valor_total,
    SUM(vi.quantidade * vi.preco_unitario) as total_quantidade_x_preco
FROM dash_vendas_itens vi
JOIN vf ON vf.id_firebird = vi.venda_id_firebird
WHERE vi.tenant_id = '{tenant_id}'
"""
print(run_query("coliseu_dashboard", sql))

client.close()

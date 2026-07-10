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

print("=== POSITIVE SALES WHERE HEADER AND ITEMS TOTALS DO NOT MATCH ===")
sql = f"""
WITH item_sums AS (
    SELECT venda_id_firebird, SUM(valor_total) as sum_items
    FROM dash_vendas_itens
    WHERE tenant_id = '{tenant_id}'
    GROUP BY 1
),
diff_sales AS (
    SELECT 
        v.id_firebird,
        v.valor_total as header_total,
        v.valor_desconto as header_desconto,
        v.valor_total - COALESCE(v.valor_desconto, 0) as header_liquido,
        i.sum_items
    FROM dash_vendas v
    JOIN item_sums i ON i.venda_id_firebird = v.id_firebird
    WHERE v.tenant_id = '{tenant_id}'
      AND v.data_hora_proc >= '{start_date}' AND v.data_hora_proc <= '{end_date}'
      AND TRIM(v.status) IN ('FATURADO', 'FINALIZADO', 'PROCESSADO')
      AND v.valor_total > 0
      AND ABS(v.valor_total - i.sum_items) > 0.05
    LIMIT 10
)
SELECT * FROM diff_sales;
"""
print(run_query("coliseu_dashboard", sql))

client.close()

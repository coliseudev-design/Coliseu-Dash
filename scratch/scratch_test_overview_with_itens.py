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

print("=== CHECKING HOJE VENDAS WITH SUBQUERIES ===")
sql = f"""
SELECT 
    (
        SELECT COALESCE(SUM(v.valor_total - COALESCE(v.valor_desconto, 0)), 0) 
        FROM dash_vendas v 
        WHERE v.tenant_id = '{tenant_id}' 
          AND v.data_hora_proc >= '2026-07-10 00:00:00+00' AND v.data_hora_proc <= '2026-07-10 23:59:59+00'
          AND TRIM(v.status) IN ('FATURADO', 'FINALIZADO', 'PROCESSADO')
    ) AS total,
    (
        SELECT COUNT(*) 
        FROM dash_vendas v 
        WHERE v.tenant_id = '{tenant_id}' 
          AND v.data_hora_proc >= '2026-07-10 00:00:00+00' AND v.data_hora_proc <= '2026-07-10 23:59:59+00'
          AND TRIM(v.status) IN ('FATURADO', 'FINALIZADO', 'PROCESSADO')
    ) AS qtd,
    (
        SELECT COALESCE(SUM(vi.quantidade * (CASE WHEN v.valor_total < 0 THEN -1 ELSE 1 END)), 0) 
        FROM dash_vendas_itens vi 
        JOIN dash_vendas v ON v.id_firebird = vi.venda_id_firebird AND v.tenant_id = vi.tenant_id 
        WHERE v.tenant_id = '{tenant_id}' 
          AND v.data_hora_proc >= '2026-07-10 00:00:00+00' AND v.data_hora_proc <= '2026-07-10 23:59:59+00'
          AND TRIM(v.status) IN ('FATURADO', 'FINALIZADO', 'PROCESSADO')
    ) AS qtd_itens
"""
print(run_query("coliseu_dashboard", sql))

client.close()

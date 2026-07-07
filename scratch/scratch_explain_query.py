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

tenant_id = 'ba7a5f04-a525-45fd-bacc-8011ed9486a1'
start_date = '2025-07-01 00:00:00+00'
end_date = '2026-07-07 23:59:59.999+00'

print("=== EXPLAIN ANALYZE ===")
sql = f"""
EXPLAIN (ANALYZE, BUFFERS)
WITH vf AS (
    SELECT v.id_firebird, v.tenant_id
    FROM dash_vendas v
    WHERE v.tenant_id = '{tenant_id}' AND v.data_hora_proc >= '{start_date}' AND v.data_hora_proc <= '{end_date}'
      AND TRIM(v.status) IN ('FATURADO', 'FINALIZADO', 'PROCESSADO')
      AND (v.depto_id = 1 OR v.depto_id IS NULL)
)
SELECT COALESCE(vi.categoria, p.categoria, 'S/ GRUPO') as categoria, SUM(vi.valor_total) AS total
FROM dash_vendas_itens vi
JOIN vf ON vf.id_firebird = vi.venda_id_firebird AND vf.tenant_id = vi.tenant_id
LEFT JOIN dash_produtos p ON p.id_firebird = vi.produto_id_firebird AND p.tenant_id = vi.tenant_id
WHERE vi.tenant_id = '{tenant_id}'
  AND COALESCE(vi.categoria, p.categoria) IS NOT NULL AND COALESCE(vi.categoria, p.categoria) != ''
GROUP BY 1 ORDER BY total DESC LIMIT 5
"""
print(run_query("coliseu_dashboard", sql))

client.close()

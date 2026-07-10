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

print("=== CATEGORY COMPARISON WITH DIFFERENT FORMULAS ===")
sql = f"""
WITH vf AS (
    SELECT 
        v.id_firebird, 
        v.tenant_id, 
        v.categoria as v_categoria,
        v.valor_total as header_total,
        COALESCE(v.valor_desconto, 0) as header_desconto,
        CASE WHEN v.valor_total = 0 THEN 0 ELSE COALESCE(v.valor_desconto, 0) / v.valor_total END as desc_ratio
    FROM dash_vendas v
    WHERE v.tenant_id = '{tenant_id}'
      AND v.data_hora_proc >= '{start_date}' AND v.data_hora_proc <= '{end_date}'
      AND TRIM(v.status) IN ('FATURADO', 'FINALIZADO', 'PROCESSADO')
)
SELECT 
    COALESCE(vi.categoria, vf.v_categoria, p.categoria) AS categoria,
    
    -- Formula A: Current Dashboard (Sum raw vi.valor_total for all matching sales)
    SUM(vi.valor_total) AS formula_a_raw_sum,
    
    -- Formula B: Multiply returns by -1 (without discount)
    SUM(vi.valor_total * CASE WHEN vf.header_total < 0 THEN -1 ELSE 1 END) AS formula_b_returns_subtracted,
    
    -- Formula C: Exclude returns completely
    SUM(CASE WHEN vf.header_total >= 0 THEN vi.valor_total ELSE 0 END) AS formula_c_positive_only,
    
    -- Formula D: Proportional Net Value (subtract discount ratio and multiply by sign of header)
    SUM(vi.valor_total * (1 - vf.desc_ratio) * CASE WHEN vf.header_total < 0 THEN -1 ELSE 1 END) AS formula_d_net_proportional,
    
    -- Formula E: Proportional Net Value (positive sales only)
    SUM(CASE WHEN vf.header_total >= 0 THEN vi.valor_total * (1 - vf.desc_ratio) ELSE 0 END) AS formula_e_net_positive_only
    
FROM dash_vendas_itens vi
JOIN vf ON vf.id_firebird = vi.venda_id_firebird AND vf.tenant_id = vi.tenant_id
LEFT JOIN dash_produtos p ON p.id_firebird = vi.produto_id_firebird AND p.tenant_id = vi.tenant_id
WHERE vi.tenant_id = '{tenant_id}'
GROUP BY 1
ORDER BY formula_d_net_proportional DESC
LIMIT 10
"""
print(run_query("coliseu_dashboard", sql))

client.close()

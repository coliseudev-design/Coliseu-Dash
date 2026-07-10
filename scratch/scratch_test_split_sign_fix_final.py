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

print("=== June 2026 SPECIES BREAKDOWN WITH SIGN FIX ===")
sql = f"""
SELECT 
    COALESCE(NULLIF(TRIM(UPPER(split_part(s.item, ':', 1))), ''), 'Não Informada') AS nome,
    SUM(
        CASE 
            WHEN s.item LIKE '%:%' THEN 
                CAST(split_part(s.item, ':', 2) AS NUMERIC) * (CASE WHEN v.valor_total < 0 THEN -1 ELSE 1 END)
            ELSE 
                (v.valor_total - COALESCE(v.valor_desconto, 0))
        END
    ) AS total,
    COUNT(DISTINCT v.id_firebird) AS qtd
FROM dash_vendas v
CROSS JOIN LATERAL regexp_split_to_table(COALESCE(v.especie, 'Não Informada'), '\\|') AS s(item)
WHERE v.tenant_id = '{tenant_id}'
  AND v.data_hora_proc >= '2026-06-01 00:00:00+00' AND v.data_hora_proc <= '2026-06-30 23:59:59+00'
  AND TRIM(status) IN ('FATURADO', 'FINALIZADO', 'PROCESSADO')
GROUP BY 1
ORDER BY total DESC;
"""
print(run_query("coliseu_dashboard", sql))

client.close()

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

print("=== TESTING POSTGRES REGEX SPLIT QUERY ===")
# We simulate a row in dash_vendas with custom especie value
sql = """
WITH mock_vendas AS (
    SELECT 
        1 AS id_firebird,
        'db05d98f-6939-4d80-af33-54cd91c35d7f'::uuid AS tenant_id,
        'BOLETO BANCARIO:120.50|DINHEIRO:300.00' AS especie,
        420.50 AS valor_total,
        0.00 AS valor_desconto
    UNION ALL
    SELECT 
        2 AS id_firebird,
        'db05d98f-6939-4d80-af33-54cd91c35d7f'::uuid AS tenant_id,
        'CARTAO CREDITO' AS especie,
        150.00 AS valor_total,
        10.00 AS valor_desconto
)
SELECT 
    COALESCE(NULLIF(split_part(s.item, ':', 1), ''), 'Não Informada') AS nome,
    SUM(
        CASE 
            WHEN s.item LIKE '%:%' THEN CAST(split_part(s.item, ':', 2) AS NUMERIC)
            ELSE (v.valor_total - COALESCE(v.valor_desconto, 0))
        END
    ) AS total,
    COUNT(*) AS qtd
FROM mock_vendas v
CROSS JOIN LATERAL regexp_split_to_table(COALESCE(v.especie, 'Não Informada'), '\\|') AS s(item)
GROUP BY 1
ORDER BY total DESC;
"""
print(run_query("coliseu_dashboard", sql))

client.close()

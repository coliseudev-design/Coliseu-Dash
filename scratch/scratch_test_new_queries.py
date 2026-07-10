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

queries = {
    "ranking.js: /ranking/produtos": f"""
        WITH vendas_filtradas AS NOT MATERIALIZED (
            SELECT v.id_firebird, v.tenant_id, v.valor_total, v.valor_desconto
            FROM dash_vendas v
            WHERE v.tenant_id = '{tenant_id}'
              AND v.data_hora_proc >= '{start_date}' AND v.data_hora_proc <= '{end_date}'
              AND TRIM(v.status) IN ('FATURADO', 'FINALIZADO', 'PROCESSADO')
        )
        SELECT 
            COALESCE(vi.produto, p.nome, 'Produto ' || COALESCE(vi.produto_id_firebird::text, '?')) AS nome,
            SUM(COALESCE(vi.valor_total * (1 - COALESCE(vf.valor_desconto, 0) / NULLIF(vf.valor_total, 0)) * (CASE WHEN vf.valor_total < 0 THEN -1 ELSE 1 END), 0)) AS total,
            SUM(vi.quantidade * (CASE WHEN vf.valor_total < 0 THEN -1 ELSE 1 END)) AS qtd_vendida,
            AVG(vi.preco_unitario) AS preco_medio
        FROM dash_vendas_itens vi
        JOIN vendas_filtradas vf ON vf.id_firebird = vi.venda_id_firebird AND vf.tenant_id = vi.tenant_id
        LEFT JOIN dash_produtos p ON p.id_firebird = vi.produto_id_firebird AND p.tenant_id = vi.tenant_id
        WHERE vi.tenant_id = '{tenant_id}'
          AND COALESCE(vi.produto, p.nome, vi.produto_id_firebird::text) IS NOT NULL
        GROUP BY 1
        ORDER BY total DESC LIMIT 10
    """,
    "ranking.js: /ranking/marcas": f"""
        WITH vendas_filtradas AS NOT MATERIALIZED (
            SELECT v.id_firebird, v.tenant_id, v.marca, v.valor_total, v.valor_desconto
            FROM dash_vendas v
            WHERE v.tenant_id = '{tenant_id}'
              AND v.data_hora_proc >= '{start_date}' AND v.data_hora_proc <= '{end_date}'
              AND TRIM(v.status) IN ('FATURADO', 'FINALIZADO', 'PROCESSADO')
        )
        SELECT 
            COALESCE(vi.marca, vf.marca, p.marca) AS marca,
            SUM(COALESCE(vi.valor_total * (1 - COALESCE(vf.valor_desconto, 0) / NULLIF(vf.valor_total, 0)) * (CASE WHEN vf.valor_total < 0 THEN -1 ELSE 1 END), 0)) AS total,
            COUNT(*) AS qtd_itens
        FROM dash_vendas_itens vi
        JOIN vendas_filtradas vf ON vf.id_firebird = vi.venda_id_firebird AND vf.tenant_id = vi.tenant_id
        LEFT JOIN dash_produtos p ON p.id_firebird = vi.produto_id_firebird AND p.tenant_id = vi.tenant_id
        WHERE vi.tenant_id = '{tenant_id}'
          AND COALESCE(vi.marca, vf.marca, p.marca) IS NOT NULL
          AND COALESCE(vi.marca, vf.marca, p.marca) != ''
        GROUP BY 1
        ORDER BY total DESC LIMIT 10
    """,
    "ranking.js: /ranking/especies": f"""
        SELECT COALESCE(v.especie, 'Não Informada') AS nome, SUM(v.valor_total - COALESCE(v.valor_desconto, 0)) AS total, COUNT(*) AS qtd
        FROM dash_vendas v
        WHERE v.tenant_id = '{tenant_id}'
          AND v.data_hora_proc >= '{start_date}'
          AND v.data_hora_proc <= '{end_date}'
          AND UPPER(TRIM(v.especie)) NOT IN ('DEVOLUCAO DE CLIENTE', 'GARANTIA', 'DEVOLUÇÃO DE CLIENTE')
          AND TRIM(v.status) IN ('FATURADO', 'FINALIZADO', 'PROCESSADO')
        GROUP BY 1 ORDER BY total DESC LIMIT 10
    """,
    "ranking.js: /ranking/categorias": f"""
        WITH vendas_filtradas AS NOT MATERIALIZED (
            SELECT v.id_firebird, v.tenant_id, v.categoria, v.valor_total, v.valor_desconto
            FROM dash_vendas v
            WHERE v.tenant_id = '{tenant_id}'
              AND v.data_hora_proc >= '{start_date}' AND v.data_hora_proc <= '{end_date}'
              AND TRIM(v.status) IN ('FATURADO', 'FINALIZADO', 'PROCESSADO')
        )
        SELECT COALESCE(vi.categoria, vf.categoria, p.categoria) AS categoria, 
               SUM(COALESCE(vi.valor_total * (1 - COALESCE(vf.valor_desconto, 0) / NULLIF(vf.valor_total, 0)) * (CASE WHEN vf.valor_total < 0 THEN -1 ELSE 1 END), 0)) AS total
        FROM dash_vendas_itens vi
        JOIN vendas_filtradas vf ON vf.id_firebird = vi.venda_id_firebird AND vf.tenant_id = vi.tenant_id
        LEFT JOIN dash_produtos p ON p.id_firebird = vi.produto_id_firebird AND p.tenant_id = vi.tenant_id
        WHERE vi.tenant_id = '{tenant_id}'
          AND COALESCE(vi.categoria, vf.categoria, p.categoria) IS NOT NULL
          AND COALESCE(vi.categoria, vf.categoria, p.categoria) != ''
        GROUP BY 1
        ORDER BY total DESC LIMIT 10
    """
}

for name, sql in queries.items():
    print(f"=== TESTING {name} ===")
    out = run_query("coliseu_dashboard", sql)
    if "ERROR" in out or "error" in out:
        print(f"FAILED: {out}")
    else:
        print("SUCCESS! Output snippet:")
        print("\n".join(out.split("\n")[:5]))

client.close()

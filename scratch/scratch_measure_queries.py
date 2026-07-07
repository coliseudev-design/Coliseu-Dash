import paramiko
import time

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

queries = {
    "1. Sales Total (Overview)": f"""
        SELECT COALESCE(SUM(v.valor_total - COALESCE(v.valor_desconto, 0)),0) AS total, COUNT(*) AS qtd 
        FROM dash_vendas v 
        WHERE v.tenant_id = '{tenant_id}' AND v.data_hora_proc >= '{start_date}' AND v.data_hora_proc <= '{end_date}' 
          AND TRIM(v.status) IN ('FATURADO', 'FINALIZADO', 'PROCESSADO')
          AND (v.depto_id = 1 OR v.depto_id IS NULL)
    """,
    "2. Devolucoes (Overview)": f"""
        SELECT COALESCE(SUM(d.valor),0) AS total 
        FROM dash_devolucoes d 
        LEFT JOIN dash_vendas v2 ON v2.id_firebird = d.venda_id_firebird AND v2.tenant_id = d.tenant_id 
        WHERE d.tenant_id = '{tenant_id}' AND d.data_devolucao >= '{start_date}' AND d.data_devolucao <= '{end_date}'
          AND (v2.depto_id = 1 OR v2.depto_id IS NULL)
    """,
    "3. Top Marcas (Overview)": f"""
        WITH vf AS NOT MATERIALIZED (
            SELECT v.id_firebird, v.tenant_id
            FROM dash_vendas v
            WHERE v.tenant_id = '{tenant_id}' AND v.data_hora_proc >= '{start_date}' AND v.data_hora_proc <= '{end_date}'
              AND TRIM(v.status) IN ('FATURADO', 'FINALIZADO', 'PROCESSADO')
              AND (v.depto_id = 1 OR v.depto_id IS NULL)
        )
        SELECT COALESCE(vi.marca, p.marca, 'S/ MARCA') AS marca, SUM(vi.valor_total) AS total
        FROM dash_vendas_itens vi
        JOIN vf ON vf.id_firebird = vi.venda_id_firebird AND vf.tenant_id = vi.tenant_id
        LEFT JOIN dash_produtos p ON p.id_firebird = vi.produto_id_firebird AND p.tenant_id = vi.tenant_id
        WHERE vi.tenant_id = '{tenant_id}'
          AND COALESCE(vi.marca, p.marca) IS NOT NULL AND COALESCE(vi.marca, p.marca) != ''
        GROUP BY 1 ORDER BY total DESC LIMIT 15
    """,
    "4. Top Categorias (Overview)": f"""
        WITH vf AS NOT MATERIALIZED (
            SELECT v.id_firebird, v.tenant_id
            FROM dash_vendas v
            WHERE v.tenant_id = '{tenant_id}' AND v.data_hora_proc >= '{start_date}' AND v.data_hora_proc <= '{end_date}'
              AND TRIM(v.status) IN ('FATURADO', 'FINALIZADO', 'PROCESSADO')
              AND (v.depto_id = 1 OR v.depto_id IS NULL)
        )
        SELECT COALESCE(vi.categoria, p.categoria, 'S/ GRUPO') AS categoria, SUM(vi.valor_total) AS total
        FROM dash_vendas_itens vi
        JOIN vf ON vf.id_firebird = vi.venda_id_firebird AND vf.tenant_id = vi.tenant_id
        LEFT JOIN dash_produtos p ON p.id_firebird = vi.produto_id_firebird AND p.tenant_id = vi.tenant_id
        WHERE vi.tenant_id = '{tenant_id}'
          AND COALESCE(vi.categoria, p.categoria) IS NOT NULL AND COALESCE(vi.categoria, p.categoria) != ''
        GROUP BY 1 ORDER BY total DESC LIMIT 15
    """,
    "5. Financeiro Receber (Overview)": f"""
        SELECT COALESCE(SUM(f.valor - f.valor_pago),0) AS v 
        FROM dash_financeiro f 
        WHERE f.tenant_id = '{tenant_id}' 
          AND COALESCE(f.data_vencimento, f.data_emissao, NOW()) >= '{start_date}' 
          AND COALESCE(f.data_vencimento, f.data_emissao, NOW()) <= '{end_date}' 
          AND f.tipo_normalized = 'RECEBER' AND f.status_pagamento_normalized = 'ABERTO'
          AND (f.depto_id = 1 OR f.depto_id IS NULL)
    """,
    "6. Sales KPIs (KPIs)": f"""
        SELECT 
            COALESCE(SUM(v.valor_total), 0) AS total_bruto,
            COUNT(DISTINCT v.id_firebird) AS qtd_pedidos,
            COALESCE(SUM(v.valor_desconto), 0) AS total_descontos
        FROM dash_vendas v
        WHERE v.tenant_id = '{tenant_id}' AND v.data_hora_proc >= '{start_date}' AND v.data_hora_proc <= '{end_date}' 
          AND TRIM(v.status) IN ('FATURADO', 'FINALIZADO', 'PROCESSADO')
          AND (v.depto_id = 1 OR v.depto_id IS NULL)
    """,
    "7. Top Categories (KPIs)": f"""
        WITH vf AS NOT MATERIALIZED (
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
    """,
    "8. Actives/Total Clientes (KPIs)": f"""
        SELECT COUNT(DISTINCT v.cliente_id_firebird) AS ativos 
        FROM dash_vendas v 
        WHERE v.tenant_id = '{tenant_id}' AND v.data_hora_proc >= '{start_date}' AND v.data_hora_proc <= '{end_date}' 
          AND TRIM(v.status) IN ('FATURADO', 'FINALIZADO', 'PROCESSADO')
          AND (v.depto_id = 1 OR v.depto_id IS NULL)
    """,
    "9. Top Clientes (KPIs)": f"""
        SELECT COALESCE(c.nome, 'Cliente ' || COALESCE(v.cliente_id_firebird::text, '?')) AS nome, SUM(v.valor_total - COALESCE(v.valor_desconto, 0)) AS total
        FROM dash_vendas v
        LEFT JOIN dash_clientes c ON c.id_firebird = v.cliente_id_firebird AND c.tenant_id = v.tenant_id
        WHERE v.tenant_id = '{tenant_id}' AND v.data_hora_proc >= '{start_date}' AND v.data_hora_proc <= '{end_date}' 
          AND TRIM(v.status) IN ('FATURADO', 'FINALIZADO', 'PROCESSADO')
          AND (v.depto_id = 1 OR v.depto_id IS NULL)
        GROUP BY v.cliente_id_firebird, c.nome
        ORDER BY total DESC LIMIT 5
    """,
    "10. Top Product (KPIs)": f"""
        SELECT COALESCE(vi.produto, p.nome, 'Sem nome') AS nome, SUM(vi.quantidade) AS qtd
        FROM dash_vendas_itens vi
        JOIN dash_vendas v ON v.id_firebird = vi.venda_id_firebird AND v.tenant_id = vi.tenant_id
        LEFT JOIN dash_produtos p ON p.id_firebird = vi.produto_id_firebird AND p.tenant_id = vi.tenant_id
        WHERE vi.tenant_id = '{tenant_id}' AND v.data_hora_proc >= '{start_date}' AND v.data_hora_proc <= '{end_date}' 
          AND TRIM(v.status) IN ('FATURADO', 'FINALIZADO', 'PROCESSADO')
          AND (vi.depto_id = 1 OR vi.depto_id IS NULL)
        GROUP BY 1
        ORDER BY qtd DESC LIMIT 1
    """
}

# Kill existing benchmark query first to prevent interference
run_query("coliseu_dashboard", "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE query LIKE '%MATERIALIZED%' AND pid != pg_backend_pid()")

for name, sql in queries.items():
    start_time = time.time()
    out = run_query("coliseu_dashboard", sql)
    end_time = time.time()
    print(f"=== {name} ===")
    print(f"Time: {end_time - start_time:.4f} seconds")

client.close()

import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('177.39.17.7', username='root', password='6EFBC!c0:wzr%Ij')

DB_CONTAINER = "coliseu-db-thyqkc5gkvp7i1nld555wakz-172547374937"

def run_query(label, sql):
    sql_escaped = sql.replace("'", "'\\''")
    cmd = f"docker exec {DB_CONTAINER} psql -U coliseu_admin -d coliseu_dashboard -c '{sql_escaped}'"
    stdin, stdout, stderr = client.exec_command(cmd)
    print(f"\n=== {label} ===")
    print(stdout.read().decode('utf-8'))
    err = stderr.read().decode('utf-8')
    if err.strip():
        print("ERR:", err)

# Parameter inputs:
# tenant_id = 'a822a7e7-fdd4-4483-bbb5-26587a72739f' (Vet Seed)
# start = '2026-01-01 00:00:00'
# end = '2026-01-31 23:59:59'
# salesFilter for Vet is (derived from cfop.js): 
# AND v.cfop IN (5101, 5102, 5103, 5104, 5105, 5106, 5109, 5110, 5111, 5112, 5113, 5114, 5115, 5116, 5118, 5119, 5120, 5122, 5123, 5251, 5252, 5253, 5254, 5255, 5256, 5257, 5258, 5401, 5402, 5403, 5405, 6101, 6102, 6103, 6104, 6105, 6106, 6107, 6108, 6109, 6110, 6111, 6112, 6113, 6114, 6115, 6116, 6118, 6119, 6120, 6122, 6123, 6251, 6252, 6253, 6254, 6255, 6256, 6257, 6258, 6401, 6402, 6403, 6404) AND UPPER(TRIM(v.status)) NOT IN ('CANCELADO', 'ABERTO', 'PENDENTE', 'ORÇAMENTO', 'ORCAMENTO', 'NULO', 'TESTE')

salesFilter = """
AND v.cfop IN (5101, 5102, 5103, 5104, 5105, 5106, 5109, 5110, 5111, 5112, 5113, 5114, 5115, 5116, 5118, 5119, 5120, 5122, 5123, 5251, 5252, 5253, 5254, 5255, 5256, 5257, 5258, 5401, 5402, 5403, 5405, 6101, 6102, 6103, 6104, 6105, 6106, 6107, 6108, 6109, 6110, 6111, 6112, 6113, 6114, 6115, 6116, 6118, 6119, 6120, 6122, 6123, 6251, 6252, 6253, 6254, 6255, 6256, 6257, 6258, 6401, 6402, 6403, 6404)
AND UPPER(TRIM(v.status)) NOT IN ('CANCELADO', 'ABERTO', 'PENDENTE', 'ORÇAMENTO', 'ORCAMENTO', 'NULO', 'TESTE')
"""

# Let's run the marcas query
run_query(
    "MARCAS QUERY",
    f"""
    SELECT COALESCE(vi.marca, v.marca, 'S/ MARCA') as nome, 
           SUM(vi.valor_total) as vendas,
           SUM(vi.custo_unitario * vi.quantidade) as custo
    FROM dash_vendas_itens vi
    JOIN dash_vendas v ON v.id_firebird = vi.venda_id_firebird AND v.tenant_id = vi.tenant_id
    WHERE vi.tenant_id = 'a822a7e7-fdd4-4483-bbb5-26587a72739f' 
      AND v.data_venda >= '2026-01-01 00:00:00' AND v.data_venda <= '2026-01-31 23:59:59'
      {salesFilter}
      AND COALESCE(vi.marca, v.marca) IS NOT NULL AND COALESCE(vi.marca, v.marca) != ''
    GROUP BY COALESCE(vi.marca, v.marca, 'S/ MARCA')
    ORDER BY vendas DESC
    LIMIT 15;
    """
)

# Let's run the grupos query
run_query(
    "GRUPOS QUERY",
    f"""
    SELECT COALESCE(vi.categoria, v.categoria, 'S/ GRUPO') as nome, 
           SUM(vi.valor_total) as vendas,
           SUM(vi.custo_unitario * vi.quantidade) as custo
    FROM dash_vendas_itens vi
    JOIN dash_vendas v ON v.id_firebird = vi.venda_id_firebird AND v.tenant_id = vi.tenant_id
    WHERE vi.tenant_id = 'a822a7e7-fdd4-4483-bbb5-26587a72739f' 
      AND v.data_venda >= '2026-01-01 00:00:00' AND v.data_venda <= '2026-01-31 23:59:59'
      {salesFilter}
      AND COALESCE(vi.categoria, v.categoria) IS NOT NULL AND COALESCE(vi.categoria, v.categoria) != ''
    GROUP BY COALESCE(vi.categoria, v.categoria, 'S/ GRUPO')
    ORDER BY vendas DESC
    LIMIT 15;
    """
)

client.close()

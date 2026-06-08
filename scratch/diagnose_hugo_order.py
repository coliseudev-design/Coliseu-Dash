import paramiko

HOST = '177.39.17.7'
USER = 'root'
PASS = '6EFBC!c0:wzr%Ij'
CONTAINER = 'coliseu-db-thyqkc5gkvp7i1nld555wakz-172547374937'

def run_query(label, sql):
    sql_escaped = sql.replace('"', '\\"')
    cmd = f'docker exec {CONTAINER} psql -U coliseu_admin -d coliseu_dashboard -c "{sql_escaped}"'
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        client.connect(HOST, username=USER, password=PASS)
        _, stdout, stderr = client.exec_command(cmd)
        out = stdout.read().decode('utf-8', errors='replace')
        err = stderr.read().decode('utf-8', errors='replace')
        print(f"\n{'='*60}\n=== {label} ===\n{'='*60}")
        print(out or "(sem resultado)")
        if err.strip():
            print("ERR:", err[:800])
    except Exception as e:
        print(f"[ERRO] {label}: {e}")
    finally:
        client.close()

# 1. Colunas da dash_vendas
run_query(
    "COLUNAS dash_vendas",
    "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'dash_vendas' ORDER BY ordinal_position"
)

# 2. Colunas da dash_vendas_itens
run_query(
    "COLUNAS dash_vendas_itens",
    "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'dash_vendas_itens' ORDER BY ordinal_position"
)

# 3. Pedido do Hugo pelo numero_pedido (cast para text)
run_query(
    "PEDIDO HUGO - dash_vendas",
    "SELECT v.id_firebird, v.numero_pedido, v.status, v.valor_total, v.data_venda, v.data_vencimento, COALESCE(v.data_vencimento, v.data_venda) as data_usada FROM dash_vendas v WHERE v.numero_pedido::text = '229124' LIMIT 5"
)

# 4. Itens do pedido Hugo
run_query(
    "ITENS DO PEDIDO HUGO",
    "SELECT vi.id, vi.produto, vi.quantidade, vi.valor_total, vi.custo_unitario, vi.categoria, vi.marca FROM dash_vendas_itens vi JOIN dash_vendas v ON v.id_firebird = vi.venda_id_firebird AND v.tenant_id = vi.tenant_id WHERE v.numero_pedido::text = '229124'"
)

# 5. Comparação soma itens vs valor_total
run_query(
    "COMPARACAO HUGO: soma_itens vs valor_venda",
    "SELECT v.numero_pedido, v.valor_total as valor_venda, COALESCE(SUM(vi.valor_total), 0) as soma_itens, (v.valor_total - COALESCE(SUM(vi.valor_total), 0)) as diferenca FROM dash_vendas v LEFT JOIN dash_vendas_itens vi ON vi.venda_id_firebird = v.id_firebird AND vi.tenant_id = v.tenant_id WHERE v.numero_pedido::text = '229124' GROUP BY v.numero_pedido, v.valor_total"
)

# 6. Comparação soma itens vs valor_total (Kleber)
run_query(
    "COMPARACAO KLEBER: soma_itens vs valor_venda",
    "SELECT v.numero_pedido, v.valor_total as valor_venda, COALESCE(SUM(vi.valor_total), 0) as soma_itens, (v.valor_total - COALESCE(SUM(vi.valor_total), 0)) as diferenca FROM dash_vendas v LEFT JOIN dash_vendas_itens vi ON vi.venda_id_firebird = v.id_firebird AND vi.tenant_id = v.tenant_id WHERE v.numero_pedido::text = '196543' GROUP BY v.numero_pedido, v.valor_total"
)

# 7. Amostra geral - pedidos com diferença entre valor_total e soma_itens
run_query(
    "PEDIDOS COM DIVERGENCIA (top 10)",
    "SELECT v.numero_pedido, v.valor_total as valor_venda, COALESCE(SUM(vi.valor_total), 0) as soma_itens, (v.valor_total - COALESCE(SUM(vi.valor_total), 0)) as diferenca FROM dash_vendas v LEFT JOIN dash_vendas_itens vi ON vi.venda_id_firebird = v.id_firebird AND vi.tenant_id = v.tenant_id WHERE v.tenant_id = (SELECT id FROM dash_tenants LIMIT 1) AND TRIM(v.status) IN ('FATURADO','FINALIZADO','PROCESSADO') GROUP BY v.numero_pedido, v.valor_total HAVING ABS(v.valor_total - COALESCE(SUM(vi.valor_total), 0)) > 0.01 ORDER BY ABS(v.valor_total - COALESCE(SUM(vi.valor_total), 0)) DESC LIMIT 10"
)

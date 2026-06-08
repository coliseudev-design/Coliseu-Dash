import psycopg2

conn_str = "postgresql://postgres:0r0E6oV!qG3h@2.24.82.19:5432/coliseudash"
try:
    conn = psycopg2.connect(conn_str)
    cur = conn.cursor()
    
    # Busca a estrutura da tabela e dados do pedido
    sql = "SELECT id_firebird, numero_pedido, data_venda, data_vencimento, valor_total, status, cfop FROM dash_vendas WHERE numero_pedido = '229124' OR id_firebird = 513034"
    cur.execute(sql)
    print("\n=== Dados do Pedido em dash_vendas ===")
    row = cur.fetchone()
    if row:
        print("id_firebird:", row[0])
        print("numero_pedido:", row[1])
        print("data_venda:", row[2])
        print("data_vencimento:", row[3])
        print("valor_total:", row[4])
        print("status:", row[5])
        print("cfop:", row[6])
    else:
        print("Pedido não encontrado em dash_vendas")

    sql_itens = "SELECT id_firebird, venda_id_firebird, produto, quantidade, preco_unitario, valor_total FROM dash_vendas_itens WHERE venda_id_firebird = 513034"
    cur.execute(sql_itens)
    print("\n=== Itens do Pedido em dash_vendas_itens ===")
    rows = cur.fetchall()
    for r in rows:
        print(r)

    conn.close()
except Exception as e:
    print("Erro ao conectar ou consultar:", e)

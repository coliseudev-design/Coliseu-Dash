import psycopg2

try:
    conn = psycopg2.connect("postgresql://postgres:0r0E6oV!qG3h@2.24.82.19:5432/coliseudash")
    cur = conn.cursor()
    
    print("--- CORTECO ITENS ---")
    cur.execute("""
        SELECT vi.venda_id_firebird, vi.produto, vi.quantidade, vi.preco_unitario, vi.valor_total, vi.marca, p.marca
        FROM dash_vendas_itens vi
        LEFT JOIN dash_produtos p ON p.id_firebird = vi.produto_id_firebird AND p.tenant_id = vi.tenant_id
        WHERE COALESCE(vi.marca, p.marca) = 'CORTECO'
        LIMIT 10
    """)
    for r in cur.fetchall():
        print(r)
        
    print("\n--- SUM OF TOTALS ---")
    cur.execute("""
        SELECT SUM(vi.valor_total), SUM(vi.quantidade), COUNT(*)
        FROM dash_vendas_itens vi
        LEFT JOIN dash_produtos p ON p.id_firebird = vi.produto_id_firebird AND p.tenant_id = vi.tenant_id
        WHERE COALESCE(vi.marca, p.marca) = 'CORTECO'
    """)
    print(cur.fetchone())

except Exception as e:
    print("ERROR:", e)

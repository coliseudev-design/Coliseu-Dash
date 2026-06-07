import psycopg2

conn_str = "postgresql://postgres:0r0E6oV!qG3h@2.24.82.19:5432/coliseudash"

try:
    print("Connecting directly to production DB on 2.24.82.19:5432...")
    conn = psycopg2.connect(conn_str, connect_timeout=5)
    print("Success!")
    cur = conn.cursor()
    
    # Query 1: Find Alice
    cur.execute("SELECT tenant_id, id_firebird, nome FROM dash_vendedores WHERE nome ILIKE '%ALICE%'")
    print("Alice in vendedores:", cur.fetchall())
    
    # Query 2: Sales grouped by tenant
    cur.execute("SELECT tenant_id, COUNT(*) FROM dash_vendas GROUP BY tenant_id")
    print("Sales by tenant:", cur.fetchall())
    
    # Query 3: June 2026 sales by status
    cur.execute("""
        SELECT status, COUNT(*), SUM(valor_total)
        FROM dash_vendas
        WHERE data_venda >= '2026-06-01' AND data_venda <= '2026-06-07 23:59:59'
        GROUP BY status
    """)
    print("June 2026 sales by status:", cur.fetchall())

    cur.close()
    conn.close()
except Exception as e:
    print("Error connecting/querying production DB:", e)

import psycopg2

conn_str = "postgresql://coliseu_user:ColiseuDB2026Prod@38.242.244.84:5432/coliseu_db"

try:
    print("Connecting directly to production DB on 38.242.244.84:5432...")
    conn = psycopg2.connect(conn_str, connect_timeout=5)
    print("Success!")
    cur = conn.cursor()
    
    # Query 1: Find Alice
    cur.execute("SELECT tenant_id, id_firebird, nome FROM dash_vendedores WHERE nome ILIKE '%ALICE%'")
    print("Alice in vendedores:", cur.fetchall())
    
    # Query 2: Sales count grouped by tenant
    cur.execute("SELECT tenant_id, COUNT(*) FROM dash_vendas GROUP BY tenant_id")
    print("Sales count by tenant:", cur.fetchall())
    
    # Query 3: Sales grouped by status for Petclub tenant
    cur.execute("""
        SELECT status, COUNT(*), SUM(valor_total)
        FROM dash_vendas
        WHERE tenant_id = '816f97c4-66fb-4ef8-905d-e0551cbf2492'
        GROUP BY status
    """)
    print("Sales by status for Petclub:", cur.fetchall())

    cur.close()
    conn.close()
except Exception as e:
    print("Error connecting/querying production DB on 38.242.244.84:", e)

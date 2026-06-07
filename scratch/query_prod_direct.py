import psycopg2
import json

conn_str = "postgresql://postgres:0r0E6oV!qG3h@2.24.82.19:5432/coliseudash"

try:
    print("Connecting to production DB on 2.24.82.19...")
    conn = psycopg2.connect(conn_str, connect_timeout=10)
    cursor = conn.cursor()
    
    # 1. Query dash_clientes for Rachel or Silesia
    print("\n=== Clientes (Rachel/Silesia) ===")
    cursor.execute("SELECT id_firebird, nome, tenant_id FROM dash_clientes WHERE nome ILIKE '%RACHEL%' OR nome ILIKE '%SILESIA%'")
    clientes = cursor.fetchall()
    for c in clientes:
        print(f"  ID: {c[0]} | Nome: {c[1]} | Tenant: {c[2]}")
        
    # 2. Query sales by numbers
    print("\n=== Sales by Numbers (514591, 514592, 196539, 196540) ===")
    cursor.execute("""
        SELECT id_firebird, numero_pedido, data_venda::text, data_vencimento::text, valor_total, status, tenant_id 
        FROM dash_vendas 
        WHERE numero_pedido IN ('514592', '514591', '196540', '196539') OR id_firebird IN (514592, 514591)
    """)
    sales = cursor.fetchall()
    for s in sales:
        print(f"  ID_Firebird: {s[0]} | Num: {s[1]} | Venda: {s[2]} | Venc: {s[3]} | Total: {s[4]} | Status: {s[5]} | Tenant: {s[6]}")
        
    # 3. Query latest synced sales overall to see recent activity
    print("\n=== Latest 5 Synced Sales ===")
    cursor.execute("""
        SELECT id_firebird, numero_pedido, data_venda::text, data_vencimento::text, valor_total, status, tenant_id, sincronizado_em::text
        FROM dash_vendas
        ORDER BY sincronizado_em DESC LIMIT 5
    """)
    latest = cursor.fetchall()
    for l in latest:
        print(f"  ID: {l[0]} | Num: {l[1]} | Venda: {l[2]} | Venc: {l[3]} | Total: {l[4]} | Status: {l[5]} | Tenant: {l[6]} | Synced: {l[7]}")
        
    cursor.close()
    conn.close()
except Exception as e:
    print("Error querying production database:", e)

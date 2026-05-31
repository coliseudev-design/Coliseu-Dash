import psycopg2

def run():
    conn = psycopg2.connect("postgresql://postgres:0r0E6oV!qG3h@2.24.82.19:5432/coliseudash")
    cur = conn.cursor()
    
    # Check tenants
    cur.execute("""
        SELECT tenant_id, COUNT(*), MAX(data_venda) 
        FROM dash_vendas 
        GROUP BY tenant_id
    """)
    print("=== Tenants in Prod ===")
    for row in cur.fetchall():
        print(row)
        
    # Check users
    cur.execute("""
        SELECT id, email, tenant_id, layout_version, use_vet_db 
        FROM dash_usuarios
    """)
    print("\n=== Users in Prod ===")
    for row in cur.fetchall():
        print(row)
        
    cur.close()
    conn.close()

if __name__ == '__main__':
    run()

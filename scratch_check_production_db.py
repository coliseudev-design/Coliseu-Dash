import psycopg2

def run_query(conn_str, label, sql):
    try:
        conn = psycopg2.connect(conn_str)
        cur = conn.cursor()
        cur.execute(sql)
        print(f"\n=== {label} ===")
        rows = cur.fetchall()
        for r in rows:
            print(r)
        conn.close()
    except Exception as e:
        print(f"[ERRO] {label}: {e}")

# Try connecting to the coliseudash DB on 2.24.82.19
conn_str = "postgresql://postgres:0r0E6oV!qG3h@2.24.82.19:5432/coliseudash"
run_query(conn_str, "Users in 2.24.82.19", "SELECT id, tenant_id, email, nome, role, layout_version, ativo FROM dash_usuarios")
run_query(conn_str, "Vendas Count in 2.24.82.19", "SELECT tenant_id, COUNT(*) FROM dash_vendas GROUP BY tenant_id")

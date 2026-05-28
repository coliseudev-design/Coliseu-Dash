import psycopg2

def run_queries():
    try:
        conn = psycopg2.connect("postgresql://postgres:0r0E6oV!qG3h@2.24.82.19:5432/coliseudash")
        cur = conn.cursor()
        
        # 1. Distinct tenants
        cur.execute("SELECT DISTINCT tenant_id FROM dash_vendas")
        print("=== Distinct Tenants in dash_vendas ===")
        print(cur.fetchall())
        
        # 2. Counts for tenant 3edd56b4-e002-48ed-8ecb-131c0c62dcfb
        tenant = '3edd56b4-e002-48ed-8ecb-131c0c62dcfb'
        tables = ['dash_clientes', 'dash_produtos', 'dash_vendedores', 'dash_vendas', 'dash_vendas_itens', 'dash_financeiro', 'dash_devolucoes']
        print(f"\n=== Row counts for tenant {tenant} ===")
        for t in tables:
            cur.execute(f"SELECT COUNT(*) FROM {t} WHERE tenant_id = %s", (tenant,))
            print(f"  {t}: {cur.fetchone()[0]}")
            
        # 3. Sum of ventas for Dec 2025
        cur.execute("""
            SELECT status, COUNT(*), SUM(valor_total) 
            FROM dash_vendas 
            WHERE tenant_id = %s AND data_venda >= '2025-12-01 00:00:00' AND data_venda <= '2025-12-31 23:59:59'
            GROUP BY status
        """, (tenant,))
        print("\n=== Dec 2025 sales ===")
        print(cur.fetchall())
        
        # 4. Check devolucoes for Dec 2025
        cur.execute("""
            SELECT COUNT(*), SUM(valor) 
            FROM dash_devolucoes 
            WHERE tenant_id = %s AND data_devolucao >= '2025-12-01 00:00:00' AND data_devolucao <= '2025-12-31 23:59:59'
        """, (tenant,))
        print("\n=== Dec 2025 devolucoes ===")
        print(cur.fetchone())
        
        # 5. Let's see if there is CFOP column in dash_vendas or dash_devolucoes
        cur.execute("SELECT column_name FROM information_schema.columns WHERE table_name = 'dash_vendas'")
        cols = [c[0] for c in cur.fetchall()]
        print("\n=== columns in dash_vendas ===")
        print(cols)
        
        conn.close()
    except Exception as e:
        print("Error:", e)

run_queries()

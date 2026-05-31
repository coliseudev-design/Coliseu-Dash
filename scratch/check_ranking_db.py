import psycopg2

conn = psycopg2.connect("postgresql://postgres:0r0E6oV!qG3h@2.24.82.19:5432/coliseudash")
cur = conn.cursor()

# Let's find a tenant id first
cur.execute("SELECT DISTINCT tenant_id FROM dash_vendas")
tenants = cur.fetchall()
print("Tenants in dash_vendas:", tenants)

# Let's inspect the max date of dash_vendas
cur.execute("SELECT tenant_id, MAX(data_venda) FROM dash_vendas GROUP BY tenant_id")
max_dates = cur.fetchall()
print("Max dates per tenant:", max_dates)

# Let's query data for a selected tenant (e.g. Layout 4/Vet tenant)
# Wait, let's see which tenant has the maximum date near 2026 or similar.
for tenant in tenants:
    t_id = tenant[0]
    cur.execute("SELECT COUNT(*) FROM dash_vendas WHERE tenant_id = %s", (t_id,))
    v_count = cur.fetchone()[0]
    cur.execute("SELECT COUNT(*) FROM dash_clientes WHERE tenant_id = %s", (t_id,))
    c_count = cur.fetchone()[0]
    cur.execute("SELECT COUNT(*) FROM dash_vendas_itens WHERE tenant_id = %s", (t_id,))
    i_count = cur.fetchone()[0]
    print(f"Tenant {t_id}: sales={v_count}, clients={c_count}, items={i_count}")

    # Run client ranking query for December 2025
    start = "2025-12-01"
    end = "2025-12-31"
    
    # Check if there are sales in this period
    cur.execute("SELECT COUNT(*), SUM(valor_total) FROM dash_vendas WHERE tenant_id = %s AND data_venda >= %s AND data_venda <= %s", (t_id, start, end))
    sales_dec = cur.fetchone()
    print(f"  Sales Dec 2025: count={sales_dec[0]}, sum={sales_dec[1]}")

    # Let's see some client values in dash_vendas directly (to verify if they have client_id_firebird)
    cur.execute("""
        SELECT cliente_id_firebird, count(*), sum(valor_total) 
        FROM dash_vendas 
        WHERE tenant_id = %s AND data_venda >= %s AND data_venda <= %s
        GROUP BY cliente_id_firebird
        LIMIT 5
    """, (t_id, start, end))
    print("  Sample client sales raw in dash_vendas:", cur.fetchall())

    # Let's run the exact query for ranking clientes
    cur.execute("""
        SELECT 
            v.cliente_id_firebird AS id,
            COALESCE(c.nome, 'Cliente ' || COALESCE(v.cliente_id_firebird::text, '?')) AS nome,
            SUM(v.valor_total) AS total
        FROM dash_vendas v
        LEFT JOIN dash_clientes c ON c.id_firebird = v.cliente_id_firebird AND c.tenant_id = v.tenant_id
        WHERE v.tenant_id = %s AND v.data_venda >= %s AND v.data_venda <= %s
        GROUP BY v.cliente_id_firebird, c.nome
        ORDER BY total DESC
        LIMIT 10
    """, (t_id, start, end))
    print("  Exact client ranking query results:", cur.fetchall())

cur.close()
conn.close()

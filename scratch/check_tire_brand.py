import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('177.39.17.7', username='root', password='6EFBC!c0:wzr%Ij')

DB_CONTAINER = "coliseu-db-thyqkc5gkvp7i1nld555wakz-172547374937"

def run_query(label, sql):
    sql_escaped = sql.replace("'", "'\\''")
    cmd = f"docker exec {DB_CONTAINER} psql -U coliseu_admin -d coliseu_dashboard_vet -c '{sql_escaped}'"
    stdin, stdout, stderr = client.exec_command(cmd)
    print(f"\n=== {label} ===")
    print(stdout.read().decode('utf-8'))

# 1. Search for any brands containing 'tire' or 't ire' or similar in Vet DB
run_query(
    "SEARCH BRANDS IN VET DB PRODUCTS",
    "SELECT DISTINCT marca, COUNT(*) FROM dash_produtos WHERE UPPER(marca) LIKE '%TIRE%' OR UPPER(marca) LIKE '%T%IRE%' GROUP BY 1;"
)

run_query(
    "SEARCH BRANDS IN VET DB VENDAS ITENS",
    "SELECT DISTINCT marca, COUNT(*) FROM dash_vendas_itens WHERE UPPER(marca) LIKE '%TIRE%' OR UPPER(marca) LIKE '%T%IRE%' GROUP BY 1;"
)

# 2. Let's see some sales rows for these brands in Vet DB
run_query(
    "VET DB SALES WITH TIRE BRAND",
    "SELECT v.id_firebird, v.cfop, v.status, vi.marca, vi.valor_total, v.data_venda FROM dash_vendas_itens vi JOIN dash_vendas v ON v.id_firebird = vi.venda_id_firebird AND v.tenant_id = vi.tenant_id WHERE UPPER(vi.marca) LIKE '%TIRE%' OR UPPER(vi.marca) LIKE '%T%IRE%' LIMIT 10;"
)

# 3. Check CFOP distribution for these brands in Vet DB
run_query(
    "VET DB CFOP DISTRIBUTION FOR TIRE",
    "SELECT v.cfop, COUNT(*), SUM(vi.valor_total) FROM dash_vendas_itens vi JOIN dash_vendas v ON v.id_firebird = vi.venda_id_firebird AND v.tenant_id = vi.tenant_id WHERE UPPER(vi.marca) LIKE '%TIRE%' OR UPPER(vi.marca) LIKE '%T%IRE%' GROUP BY 1;"
)

# 4. Check STATUS distribution for these brands in Vet DB
run_query(
    "VET DB STATUS DISTRIBUTION FOR TIRE",
    "SELECT v.status, COUNT(*), SUM(vi.valor_total) FROM dash_vendas_itens vi JOIN dash_vendas v ON v.id_firebird = vi.venda_id_firebird AND v.tenant_id = vi.tenant_id WHERE UPPER(vi.marca) LIKE '%TIRE%' OR UPPER(vi.marca) LIKE '%T%IRE%' GROUP BY 1;"
)

# 5. List all unique brands in Vet DB to see what they are named
run_query(
    "ALL VET DB BRANDS",
    "SELECT DISTINCT marca, COUNT(*) FROM dash_vendas_itens GROUP BY 1 ORDER BY 2 DESC LIMIT 40;"
)

client.close()

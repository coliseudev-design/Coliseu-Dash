import paramiko

HOST = '177.39.17.7'
USER = 'root'
PASS = '6EFBC!c0:wzr%Ij'
CONTAINER = 'coliseu-db-thyqkc5gkvp7i1nld555wakz-172547374937'

def run_query(sql, label):
    sql_escaped = sql.replace('"', '\\"')
    cmd = f'docker exec {CONTAINER} psql -U coliseu_admin -d coliseu_dashboard -c "{sql_escaped}"'
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        client.connect(HOST, username=USER, password=PASS)
        _, stdout, stderr = client.exec_command(cmd)
        print(f"\n=== {label} ===")
        print(stdout.read().decode('utf-8'))
    except Exception as e:
        print(f"[ERROR] {label}: {e}")
    finally:
        client.close()

# Let's count sales per tenant in coliseu_dashboard
run_query("SELECT tenant_id, COUNT(*), SUM(valor_total) FROM dash_vendas GROUP BY tenant_id;", "Sales per tenant")

# Search in dash_clientes for any column containing 'HUGO'
run_query(
    "SELECT id_firebird, tenant_id, nome, documento FROM dash_clientes WHERE nome ILIKE '%HUGO%' OR nome ILIKE '%ZEFERINO%' OR nome ILIKE '%AMORA%' OR nome ILIKE '%DAYANE%' OR nome ILIKE '%QUEIROZ%' OR nome ILIKE '%ZOE%';",
    "Deep Customer Search"
)

# Search in dash_vendas for any client name, or any text field containing 'HUGO' or similar
run_query(
    "SELECT id_firebird, tenant_id, numero_pedido, valor_total, cliente_id_firebird FROM dash_vendas WHERE valor_total = 247.00 OR valor_total = 618.80;",
    "Vendas by Value 247 or 618.80"
)

# Search in dash_vendas_itens for product names
run_query(
    "SELECT DISTINCT produto, tenant_id FROM dash_vendas_itens WHERE produto ILIKE '%BANHO%' OR produto ILIKE '%TOP DOG%' LIMIT 20;",
    "Items containing Banho or Top Dog"
)

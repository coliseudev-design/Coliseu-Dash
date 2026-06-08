import paramiko

HOST = '177.39.17.7'
USER = 'root'
PASS = '6EFBC!c0:wzr%Ij'
CONTAINER = 'coliseu-db-thyqkc5gkvp7i1nld555wakz-172547374937'

def run_query(db_name, sql, label):
    sql_escaped = sql.replace('"', '\\"')
    cmd = f'docker exec {CONTAINER} psql -U coliseu_admin -d {db_name} -c "{sql_escaped}"'
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        client.connect(HOST, username=USER, password=PASS)
        _, stdout, stderr = client.exec_command(cmd)
        out = stdout.read().decode('utf-8')
        err = stderr.read().decode('utf-8')
        print(f"\n=== DB: {db_name} | {label} ===")
        print(out or "(no result)")
        if err.strip():
            print("ERR:", err)
    except Exception as e:
        print(f"[ERROR] {label}: {e}")
    finally:
        client.close()

# List of databases to try
dbs = ['coliseu_dashboard', 'coliseu_dashboard_vet']

for db in dbs:
    # 1. Search in dash_clientes
    run_query(
        db,
        "SELECT id_firebird, tenant_id, nome FROM dash_clientes WHERE nome ILIKE '%HUGO%' OR nome ILIKE '%DAYANE%';",
        "Search clients by name"
    )
    
    # 2. Search in dash_vendas by value
    run_query(
        db,
        "SELECT id_firebird, tenant_id, data_venda, data_vencimento, valor_total, status, cliente_id_firebird FROM dash_vendas WHERE valor_total IN (247.00, 618.80, 59.80, 189.00, 38.00, 38.80);",
        "Search sales by exact values"
    )

    # 3. Search in dash_vendas_itens by product name or client id
    run_query(
        db,
        "SELECT id_firebird, venda_id_firebird, produto, valor_total FROM dash_vendas_itens WHERE produto ILIKE '%BANHO%' OR produto ILIKE '%TOP DOG%' LIMIT 10;",
        "Search items by name"
    )

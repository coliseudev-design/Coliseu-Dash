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
        print(f"=== {label} ===")
        print(stdout.read().decode('utf-8'))
    except Exception as e:
        print(f"[ERROR]: {e}")
    finally:
        client.close()

PETCLUB = '816f97c4-66fb-4ef8-905d-e0551cbf2492'

run_query(f"SELECT COUNT(*) FROM dash_vendas WHERE tenant_id = '{PETCLUB}';", "Sales Count for Petclub")
run_query(f"SELECT id_firebird, numero_pedido, data_venda, data_vencimento, valor_total, status FROM dash_vendas WHERE tenant_id = '{PETCLUB}' ORDER BY data_venda DESC LIMIT 20;", "Recent Sales for Petclub")

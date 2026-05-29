import paramiko

HOST = '177.39.17.7'
USER = 'root'
PASS = '6EFBC!c0:wzr%Ij'
CONTAINER = 'coliseu-db-thyqkc5gkvp7i1nld555wakz-172547374937'

def run_query(label, sql):
    sql_escaped = sql.replace('"', '\\"')
    cmd = f'docker exec {CONTAINER} psql -U coliseu_admin -d coliseu_dashboard -c "{sql_escaped}"'
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        client.connect(HOST, username=USER, password=PASS)
        _, stdout, stderr = client.exec_command(cmd)
        print(f"\n=== {label} ===")
        print(stdout.read().decode('utf-8'))
        err = stderr.read().decode('utf-8')
        if err.strip():
            print("ERR:", err)
    except Exception as e:
        print(f"[ERRO]: {e}")
    finally:
        client.close()

# List triggers
run_query(
    "TRIGGERS ON dash_vendas_itens",
    "SELECT trigger_name, event_manipulation, action_statement FROM information_schema.triggers WHERE event_object_table = 'dash_vendas_itens'"
)

# List columns of dash_vendas_itens
run_query(
    "COLUMNS OF dash_vendas_itens",
    "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'dash_vendas_itens'"
)

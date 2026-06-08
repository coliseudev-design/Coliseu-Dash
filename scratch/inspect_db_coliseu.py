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
        out = stdout.read().decode('utf-8')
        err = stderr.read().decode('utf-8')
        print(f"\n=== {label} ===")
        print(out or "(sem resultado)")
        if err.strip():
            print("ERR:", err)
    except Exception as e:
        print(f"[ERRO] {label}: {e}")
    finally:
        client.close()

# 1. Inspecionar o pedido do Hugo por numero_pedido
run_query(
    "Hugo Order - 229124",
    "SELECT id_firebird, numero_pedido, data_venda, data_vencimento, valor_total, status, cfop, sincronizado_em FROM dash_vendas WHERE numero_pedido = '229124'"
)

# 2. Inspecionar as últimas vendas sincronizadas
run_query(
    "Últimas Vendas Sincronizadas",
    "SELECT id_firebird, numero_pedido, data_venda, data_vencimento, valor_total, status, sincronizado_em FROM dash_vendas ORDER BY sincronizado_em DESC LIMIT 5"
)

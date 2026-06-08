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

# Query 1: Any June 2026 sales in the database
run_query(
    "June 2026 sales in database",
    """SELECT tenant_id, COUNT(*), SUM(valor_total)
       FROM dash_vendas
       WHERE data_venda >= '2026-06-01' AND data_venda <= '2026-06-30 23:59:59'
       GROUP BY tenant_id"""
)

# Query 2: Let's list the June 2026 sales for ed1d3a98-4c4d-48db-99c0-8751926eb8e5 or others
run_query(
    "Sample June 2026 sales",
    """SELECT tenant_id, id_firebird, numero_pedido, data_venda, vendedor_id_firebird, valor_total, status
       FROM dash_vendas
       WHERE data_venda >= '2026-06-01' AND data_venda <= '2026-06-07 23:59:59'
       LIMIT 20"""
)

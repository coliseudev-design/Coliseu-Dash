import paramiko

HOST = '177.39.17.7'
USER = 'root'
PASS = '6EFBC!c0:wzr%Ij'

def run_cmd_via_vps(sql_query):
    # Escape single quotes for the bash command
    sql_escaped = sql_query.replace("'", "'\\''")
    # We will use sshpass to SSH from the VPS (177.39.17.7) to the production database VPS (38.242.244.84)
    # and run the psql query on coliseu_db as coliseu_user.
    cmd = (
        f"sshpass -p '{PASS}' ssh -o StrictHostKeyChecking=no root@38.242.244.84 "
        f'"PGPASSWORD=\'ColiseuDB2026Prod\' psql -h 127.0.0.1 -U coliseu_user -d coliseu_db -c \'{sql_escaped}\'"'
    )
    
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        client.connect(HOST, username=USER, password=PASS)
        _, stdout, stderr = client.exec_command(cmd)
        out = stdout.read().decode('utf-8')
        err = stderr.read().decode('utf-8')
        print(f"\n=== QUERY: {sql_query} ===")
        print(out or "(sem resultado)")
        if err.strip():
            print("ERR:", err)
    except Exception as e:
        print(f"ERRO: {e}")
    finally:
        client.close()

# 1. Search for the two orders
run_cmd_via_vps(
    "SELECT id_firebird, numero_pedido, tenant_id, data_venda, valor_total, valor_desconto, status "
    "FROM dash_vendas "
    "WHERE id_firebird IN (18714, 18737) OR numero_pedido IN ('6776', '11374');"
)

# 2. Get list of all tenants and row count in production
run_cmd_via_vps("SELECT tenant_id, COUNT(*) FROM dash_vendas GROUP BY tenant_id")

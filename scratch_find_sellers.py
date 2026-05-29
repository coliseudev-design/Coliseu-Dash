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

run_query(
    "FIND MARILIA IRENE IN VENDEDORES",
    """SELECT tenant_id, id_firebird, nome
       FROM dash_vendedores
       WHERE nome LIKE '%MARILIA%' OR nome LIKE '%JAIME%'"""
)

run_query(
    "FIND MARILIA IRENE IN SALES",
    """SELECT tenant_id, vendedor, COUNT(*), SUM(valor_total)
       FROM dash_vendas
       WHERE vendedor LIKE '%MARILIA%' OR vendedor LIKE '%JAIME%'
       GROUP BY tenant_id, vendedor"""
)

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
    "REAL TENANT - SALES COUNT",
    """SELECT COUNT(*) as total_vendas, COUNT(cfop) as total_com_cfop, MAX(data_venda) as ultima_venda
       FROM dash_vendas
       WHERE tenant_id = '3edd56b4-e002-48ed-8ecb-131c0c62dcfb'"""
)

run_query(
    "REAL TENANT - SALES IN JAN 2026",
    """SELECT COUNT(*) as total_vendas, SUM(valor_total) as total_valor
       FROM dash_vendas
       WHERE tenant_id = '3edd56b4-e002-48ed-8ecb-131c0c62dcfb'
         AND data_venda >= '2026-01-01' AND data_venda < '2026-02-01'"""
)

run_query(
    "REAL TENANT - USER COUNT",
    """SELECT * FROM dash_usuarios
       WHERE tenant_id = '3edd56b4-e002-48ed-8ecb-131c0c62dcfb'"""
)

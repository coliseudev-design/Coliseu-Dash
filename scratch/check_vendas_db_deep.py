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
        print(f"[ERROR]: {e}")
    finally:
        client.close()

# List counts grouped by tenant and month of data_venda
run_query(
    """SELECT 
         tenant_id, 
         TO_CHAR(data_venda, 'YYYY-MM') as mes, 
         COUNT(*), 
         SUM(valor_total) 
       FROM dash_vendas 
       GROUP BY tenant_id, TO_CHAR(data_venda, 'YYYY-MM') 
       ORDER BY tenant_id, mes DESC;""",
    "Sales counts by Tenant and Month"
)

import paramiko

HOST = '2.24.82.19'
USER = 'root'
PASS = 'Col@13894645'
CONTAINER = 'vasjsucz4yxcb7m4rtqindd2'
TENANT = '2395efd5-6476-4f3c-a7b8-f31d5567b42f'

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())

try:
    client.connect(HOST, username=USER, password=PASS, timeout=10)
    
    # Query min, max, count in dash_vendas
    sql = (
        f"SELECT MIN(data_venda) as min_venda, MAX(data_venda) as max_venda, "
        f"       MIN(data_vencimento) as min_venc, MAX(data_vencimento) as max_venc, "
        f"       COUNT(*) as total_vendas "
        f"FROM dash_vendas WHERE tenant_id = '{TENANT}';"
    )
    cmd = f"docker exec {CONTAINER} psql -U coliseu_admin -d coliseu_dashboard -c \"{sql}\""
    _, stdout, _ = client.exec_command(cmd)
    print("=== DATE RANGE FOR SALES ===")
    print(stdout.read().decode('utf-8'))
    
    # Check if there are sales in April that were deleted or filtered out by status
    sql_status = (
        f"SELECT status, COUNT(*) "
        f"FROM dash_vendas WHERE tenant_id = '{TENANT}' "
        f"GROUP BY status;"
    )
    cmd_status = f"docker exec {CONTAINER} psql -U coliseu_admin -d coliseu_dashboard -c \"{sql_status}\""
    _, stdout_status, _ = client.exec_command(cmd_status)
    print("=== SALES COUNT BY STATUS ===")
    print(stdout_status.read().decode('utf-8'))

except Exception as e:
    print("ERRO:", e)
finally:
    client.close()

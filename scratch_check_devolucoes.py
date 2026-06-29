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
    
    # Query sum of devolucoes by month in 2026
    sql = (
        f"SELECT TO_CHAR(data_devolucao, 'MM/YYYY') as mes, COUNT(*), SUM(valor) as total_dev "
        f"FROM dash_devolucoes "
        f"WHERE tenant_id = '{TENANT}' "
        f"  AND data_devolucao >= '2026-04-01' "
        f"  AND data_devolucao <= '2026-06-30' "
        f"GROUP BY mes ORDER BY mes;"
    )
    cmd = f"docker exec {CONTAINER} psql -U coliseu_admin -d coliseu_dashboard -c \"{sql}\""
    _, stdout, _ = client.exec_command(cmd)
    print("=== DEVOLUCOES BY MONTH ===")
    print(stdout.read().decode('utf-8'))
    
    # Query sales without returns for comparison
    sql_sales = (
        f"SELECT TO_CHAR(COALESCE(data_vencimento, data_venda), 'MM/YYYY') as mes, "
        f"       SUM(valor_total - COALESCE(valor_desconto, 0)) as total_vendas "
        f"FROM dash_vendas "
        f"WHERE tenant_id = '{TENANT}' "
        f"  AND COALESCE(data_vencimento, data_venda) >= '2026-04-01' "
        f"  AND COALESCE(data_vencimento, data_venda) <= '2026-06-30' "
        f"  AND UPPER(TRIM(status)) IN ('FATURADO', 'FINALIZADO', 'PROCESSADO') "
        f"GROUP BY mes ORDER BY mes;"
    )
    cmd_sales = f"docker exec {CONTAINER} psql -U coliseu_admin -d coliseu_dashboard -c \"{sql_sales}\""
    _, stdout_sales, _ = client.exec_command(cmd_sales)
    print("=== SALES BY MONTH (WITHOUT RETURN SUBTRACTION) ===")
    print(stdout_sales.read().decode('utf-8'))

except Exception as e:
    print("ERRO:", e)
finally:
    client.close()

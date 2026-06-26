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
    
    # Query monthly and daily totals for April and May 2026
    for month, start_date, end_date in [('APRIL', '2026-04-01', '2026-04-30'), ('MAY', '2026-05-01', '2026-05-31'), ('JUNE', '2026-06-01', '2026-06-30')]:
        sql = (
            f"SELECT COALESCE(data_vencimento::date, data_venda::date) as dia, COUNT(*), "
            f"SUM(valor_total - COALESCE(valor_desconto, 0)) as total "
            f"FROM dash_vendas WHERE tenant_id = '{TENANT}' "
            f"AND COALESCE(data_vencimento, data_venda) >= '{start_date}' "
            f"AND COALESCE(data_vencimento, data_venda) <= '{end_date}' "
            f"AND UPPER(TRIM(status)) IN ('FATURADO', 'FINALIZADO', 'PROCESSADO') "
            f"AND (UPPER(TRIM(COALESCE(especie, ''))) != 'GARANTIA' OR (COALESCE(valor_total, 0) - COALESCE(valor_desconto, 0)) >= 0) "
            f"GROUP BY dia ORDER BY dia;"
        )
        cmd = f"docker exec {CONTAINER} psql -U coliseu_admin -d coliseu_dashboard -c \"{sql}\""
        _, stdout, _ = client.exec_command(cmd)
        print(f"=== {month} 2026 ===")
        print(stdout.read().decode('utf-8'))
        
        # Monthly total
        sql_month = (
            f"SELECT COUNT(*), SUM(valor_total - COALESCE(valor_desconto, 0)) as total "
            f"FROM dash_vendas WHERE tenant_id = '{TENANT}' "
            f"AND COALESCE(data_vencimento, data_venda) >= '{start_date}' "
            f"AND COALESCE(data_vencimento, data_venda) <= '{end_date}' "
            f"AND UPPER(TRIM(status)) IN ('FATURADO', 'FINALIZADO', 'PROCESSADO') "
            f"AND (UPPER(TRIM(COALESCE(especie, ''))) != 'GARANTIA' OR (COALESCE(valor_total, 0) - COALESCE(valor_desconto, 0)) >= 0);"
        )
        cmd_month = f"docker exec {CONTAINER} psql -U coliseu_admin -d coliseu_dashboard -t -c \"{sql_month}\""
        _, stdout_month, _ = client.exec_command(cmd_month)
        print(f"=== {month} MONTHLY TOTAL ===")
        print(stdout_month.read().decode('utf-8').strip())
        print("\n")
        
except Exception as e:
    print("ERRO:", e)
finally:
    client.close()

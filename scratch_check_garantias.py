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
    
    # Query count and sum of 'GARANTIA' sales by month in 2026
    sql = (
        f"SELECT TO_CHAR(COALESCE(data_vencimento, data_venda), 'MM/YYYY') as mes, "
        f"       COUNT(*), "
        f"       SUM(CASE WHEN (valor_total - COALESCE(valor_desconto, 0)) >= 0 THEN (valor_total - COALESCE(valor_desconto, 0)) ELSE 0 END) as total_positivo, "
        f"       SUM(CASE WHEN (valor_total - COALESCE(valor_desconto, 0)) < 0 THEN (valor_total - COALESCE(valor_desconto, 0)) ELSE 0 END) as total_negativo "
        f"FROM dash_vendas "
        f"WHERE tenant_id = '{TENANT}' "
        f"  AND COALESCE(data_vencimento, data_venda) >= '2026-04-01' "
        f"  AND COALESCE(data_vencimento, data_venda) <= '2026-06-30' "
        f"  AND UPPER(TRIM(especie)) = 'GARANTIA' "
        f"GROUP BY mes ORDER BY mes;"
    )
    cmd = f"docker exec {CONTAINER} psql -U coliseu_admin -d coliseu_dashboard -c \"{sql}\""
    _, stdout, _ = client.exec_command(cmd)
    print("=== GARANTIA SALES BY MONTH ===")
    print(stdout.read().decode('utf-8'))
    
except Exception as e:
    print("ERRO:", e)
finally:
    client.close()

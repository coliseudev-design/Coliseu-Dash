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
    
    target_values = [-2380.00, -600.00, -358.00, -2268.00, -16.00, -494.00, -128.00, -48.00, -512.00]
    
    # Query negative sales matching these values in June 2026
    values_str = ", ".join([str(v) for v in target_values])
    sql = (
        f"SELECT id_firebird, numero_pedido, data_venda, "
        f"       (valor_total - COALESCE(valor_desconto, 0)) as neto, especie, status, es, processo "
        f"FROM dash_vendas "
        f"WHERE tenant_id = '{TENANT}' "
        f"  AND COALESCE(data_vencimento, data_venda) >= '2026-06-01' "
        f"  AND COALESCE(data_vencimento, data_venda) <= '2026-06-30' "
        f"  AND ROUND((valor_total - COALESCE(valor_desconto, 0))::numeric, 2) IN ({values_str}) "
        f"ORDER BY neto ASC;"
    )
    cmd = f"docker exec {CONTAINER} psql -U coliseu_admin -d coliseu_dashboard -c \"{sql}\""
    _, stdout, _ = client.exec_command(cmd)
    print("=== NEGATIVE SALES MATCHING TARGET VALUES ===")
    print(stdout.read().decode('utf-8'))
    
except Exception as e:
    print("ERRO:", e)
finally:
    client.close()

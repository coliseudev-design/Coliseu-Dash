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
    
    # Query all details of transactions with net absolute value = 494.00
    sql = (
        f"SELECT id_firebird, numero_pedido, data_venda, "
        f"       valor_total, valor_desconto, (valor_total - COALESCE(valor_desconto, 0)) as neto, "
        f"       especie, status, es, processo "
        f"FROM dash_vendas "
        f"WHERE tenant_id = '{TENANT}' "
        f"  AND ROUND(ABS(valor_total - COALESCE(valor_desconto, 0))::numeric, 2) = 494.00 "
        f"ORDER BY data_venda;"
    )
    cmd = f"docker exec {CONTAINER} psql -U coliseu_admin -d coliseu_dashboard -c \"{sql}\""
    _, stdout, _ = client.exec_command(cmd)
    print("=== TRANSACTIONS WITH VALUE 494.00 ===")
    print(stdout.read().decode('utf-8'))
    
except Exception as e:
    print("ERRO:", e)
finally:
    client.close()

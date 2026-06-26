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
    
    # Query specific transaction ids that are candidate to explain the differences
    ids = [18488, 20593, 20297, 22831, 24110, 22699, 25811, 26339]
    ids_str = ", ".join([str(i) for i in ids])
    
    sql = (
        f"SELECT id_firebird, numero_pedido, data_venda, data_vencimento, data_hora_proc, "
        f"       valor_total, valor_desconto, (valor_total - COALESCE(valor_desconto, 0)) as neto, "
        f"       especie, status, es, processo "
        f"FROM dash_vendas "
        f"WHERE tenant_id = '{TENANT}' "
        f"  AND id_firebird IN ({ids_str});"
    )
    cmd = f"docker exec {CONTAINER} psql -U coliseu_admin -d coliseu_dashboard -c \"{sql}\""
    _, stdout, _ = client.exec_command(cmd)
    print("=== DETAILS OF DISCREPANT TRANSACTIONS ===")
    print(stdout.read().decode('utf-8'))
    
except Exception as e:
    print("ERRO:", e)
finally:
    client.close()

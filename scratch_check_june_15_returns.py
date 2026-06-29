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
    
    # Query negative sales in June 2026 to see if any has vencimento or proc date on June 15th
    sql = (
        f"SELECT id_firebird, numero_pedido, data_venda, data_vencimento, data_hora_proc, "
        f"       (valor_total - COALESCE(valor_desconto, 0)) as neto, especie, status, es, processo "
        f"FROM dash_vendas "
        f"WHERE tenant_id = '{TENANT}' "
        f"  AND (valor_total - COALESCE(valor_desconto, 0)) < 0 "
        f"  AND (data_venda::date = '2026-06-15' OR data_vencimento::date = '2026-06-15' OR data_hora_proc::date = '2026-06-15') "
        f"ORDER BY neto ASC;"
    )
    cmd = f"docker exec {CONTAINER} psql -U coliseu_admin -d coliseu_dashboard -c \"{sql}\""
    _, stdout, _ = client.exec_command(cmd)
    print("=== NEGATIVE SALES ON JUNE 15TH ===")
    print(stdout.read().decode('utf-8'))
    
except Exception as e:
    print("ERRO:", e)
finally:
    client.close()

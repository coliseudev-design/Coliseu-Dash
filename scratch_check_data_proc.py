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
    
    # Query sales in June 2026 where data_hora_proc is set
    sql = (
        f"SELECT id_firebird, numero_pedido, data_venda, data_vencimento, data_hora_proc, "
        f"       (valor_total - COALESCE(valor_desconto, 0)) as neto, status "
        f"FROM dash_vendas "
        f"WHERE tenant_id = '{TENANT}' "
        f"  AND COALESCE(data_vencimento, data_venda) >= '2026-06-01' "
        f"  AND COALESCE(data_vencimento, data_venda) <= '2026-06-30' "
        f"  AND data_hora_proc IS NOT NULL "
        f"  AND UPPER(TRIM(status)) IN ('FATURADO', 'FINALIZADO', 'PROCESSADO') "
        f"ORDER BY data_venda;"
    )
    cmd = f"docker exec {CONTAINER} psql -U coliseu_admin -d coliseu_dashboard -c \"{sql}\""
    _, stdout, _ = client.exec_command(cmd)
    print("=== SALES WITH DATA_HORA_PROC IN JUNE ===")
    print(stdout.read().decode('utf-8'))
    
except Exception as e:
    print("ERRO:", e)
finally:
    client.close()

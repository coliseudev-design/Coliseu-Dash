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
    
    # Query sales in June 2026 where data_vencimento::date != data_venda::date
    sql = (
        f"SELECT id_firebird, numero_pedido, data_venda::date as dt_venda, "
        f"       data_vencimento::date as dt_venc, "
        f"       (valor_total - COALESCE(valor_desconto, 0)) as neto, especie, status "
        f"FROM dash_vendas "
        f"WHERE tenant_id = '{TENANT}' "
        f"  AND (data_venda >= '2026-05-01' OR data_vencimento >= '2026-05-01') "
        f"  AND (data_venda <= '2026-07-01' OR data_vencimento <= '2026-07-01') "
        f"  AND data_vencimento::date != data_venda::date "
        f"  AND UPPER(TRIM(status)) IN ('FATURADO', 'FINALIZADO', 'PROCESSADO') "
        f"ORDER BY dt_venda ASC;"
    )
    cmd = f"docker exec {CONTAINER} psql -U coliseu_admin -d coliseu_dashboard -c \"{sql}\""
    _, stdout, _ = client.exec_command(cmd)
    print("=== SALES WITH DIFFERENT VENCIMENTO AND VENDA DATES ===")
    print(stdout.read().decode('utf-8'))
    
except Exception as e:
    print("ERRO:", e)
finally:
    client.close()

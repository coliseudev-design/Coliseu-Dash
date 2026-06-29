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
    
    # Query June 5th sales grouped by es, processo, val_type
    sql = (
        f"SELECT es, processo, "
        f"       CASE WHEN (valor_total - COALESCE(valor_desconto, 0)) >= 0 THEN 'POSITIVE' ELSE 'NEGATIVE' END as val_type, "
        f"       COUNT(*), "
        f"       SUM(valor_total - COALESCE(valor_desconto, 0)) as total "
        f"FROM dash_vendas "
        f"WHERE tenant_id = '{TENANT}' "
        f"  AND COALESCE(data_vencimento::date, data_venda::date) = '2026-06-05' "
        f"  AND UPPER(TRIM(status)) IN ('FATURADO', 'FINALIZADO', 'PROCESSADO') "
        f"GROUP BY es, processo, val_type "
        f"ORDER BY es, processo, val_type;"
    )
    cmd = f"docker exec {CONTAINER} psql -U coliseu_admin -d coliseu_dashboard -c \"{sql}\""
    _, stdout, _ = client.exec_command(cmd)
    print("=== June 5th sales grouped ===")
    print(stdout.read().decode('utf-8'))
    
except Exception as e:
    print("ERRO:", e)
finally:
    client.close()

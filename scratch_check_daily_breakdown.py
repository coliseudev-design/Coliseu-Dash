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
    
    # Days with differences in June
    days = ['2026-06-02', '2026-06-03', '2026-06-05', '2026-06-10', '2026-06-12', '2026-06-15', '2026-06-16', '2026-06-18']
    
    for day in days:
        sql = (
            f"SELECT id_firebird, numero_pedido, "
            f"       valor_total, valor_desconto, (valor_total - COALESCE(valor_desconto, 0)) as neto, "
            f"       especie, status, es, processo "
            f"FROM dash_vendas "
            f"WHERE tenant_id = '{TENANT}' "
            f"  AND COALESCE(data_vencimento::date, data_venda::date) = '{day}' "
            f"  AND UPPER(TRIM(status)) IN ('FATURADO', 'FINALIZADO', 'PROCESSADO') "
            f"ORDER BY neto DESC;"
        )
        cmd = f"docker exec {CONTAINER} psql -U coliseu_admin -d coliseu_dashboard -c \"{sql}\""
        _, stdout, _ = client.exec_command(cmd)
        lines = stdout.read().decode('utf-8').split('\n')
        
        # Filter and show only transactions whose neto values are candidates or match the discrepancy values
        print(f"\n==================== DAY: {day} ====================")
        print(lines[0]) # Header
        print(lines[1]) # Divider
        for line in lines[2:]:
            if any(val in line for val in ['2380.00', '600.00', '358.00', '2268.00', '16.00', '494.00', '128.00', '48.00', '512.00']):
                print(line)
                
except Exception as e:
    print("ERRO:", e)
finally:
    client.close()

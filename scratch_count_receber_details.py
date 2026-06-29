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
    
    # Query specific RECEBER records matching the discrepancy values
    values = [2380.00, 2268.00, 358.00, 128.00, 48.00, 16.00]
    for val in values:
        sql = (
            f"SELECT id_firebird, tipo, valor, data_emissao::date as dt_emissao, "
            f"       data_vencimento::date as dt_venc, data_pagamento::date as dt_pag, status_pagamento "
            f"FROM dash_financeiro "
            f"WHERE tenant_id = '{TENANT}' "
            f"  AND TRIM(tipo) = 'RECEBER' "
            f"  AND ROUND(valor::numeric, 2) = {val} "
            f"  AND (data_emissao >= '2026-06-01' OR data_vencimento >= '2026-06-01' OR data_pagamento >= '2026-06-01') "
            f"  AND (data_emissao <= '2026-06-30' OR data_vencimento <= '2026-06-30' OR data_pagamento <= '2026-06-30') "
            f"ORDER BY dt_emissao;"
        )
        cmd = f"docker exec {CONTAINER} psql -U coliseu_admin -d coliseu_dashboard -c \"{sql}\""
        _, stdout, _ = client.exec_command(cmd)
        print(f"\n=== RECEBER RECORDS FOR VALUE: {val} ===")
        print(stdout.read().decode('utf-8'))
        
except Exception as e:
    print("ERRO:", e)
finally:
    client.close()

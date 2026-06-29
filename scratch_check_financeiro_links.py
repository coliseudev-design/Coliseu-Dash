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
    
    # Query financeiro records matching these specific values in June 2026
    values = [2380.00, 600.00, 358.00, 2268.00, 16.00, 494.00, 128.00, 48.00]
    values_str = ", ".join([str(v) for v in values])
    
    sql = (
        f"SELECT id_firebird, tipo, tipo_documento, valor, valor_pago, status_pagamento, "
        f"       data_emissao::date, data_vencimento::date, data_pagamento::date "
        f"FROM dash_financeiro "
        f"WHERE tenant_id = '{TENANT}' "
        f"  AND (data_emissao >= '2026-06-01' OR data_vencimento >= '2026-06-01' OR data_pagamento >= '2026-06-01') "
        f"  AND (data_emissao <= '2026-06-30' OR data_vencimento <= '2026-06-30' OR data_pagamento <= '2026-06-30') "
        f"  AND ROUND(valor::numeric, 2) IN ({values_str}) "
        f"ORDER BY valor DESC;"
    )
    cmd = f"docker exec {CONTAINER} psql -U coliseu_admin -d coliseu_dashboard -c \"{sql}\""
    _, stdout, _ = client.exec_command(cmd)
    print("=== FINANCEIRO RECORDS MATCHING VALUES ===")
    print(stdout.read().decode('utf-8'))
    
except Exception as e:
    print("ERRO:", e)
finally:
    client.close()

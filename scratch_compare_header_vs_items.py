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
    
    # 1. Header sum for June 2026
    sql_header = (
        f"SELECT COALESCE(SUM(v.valor_total - COALESCE(v.valor_desconto, 0)), 0) as header_total "
        f"FROM dash_vendas v WHERE v.tenant_id = '{TENANT}' "
        f"AND COALESCE(v.data_vencimento, v.data_venda) >= '2026-06-01' "
        f"AND COALESCE(v.data_vencimento, v.data_venda) <= '2026-06-30' "
        f"AND UPPER(TRIM(v.status)) IN ('FATURADO', 'FINALIZADO', 'PROCESSADO') "
        f"AND (UPPER(TRIM(COALESCE(v.especie, ''))) != 'GARANTIA' OR (COALESCE(v.valor_total, 0) - COALESCE(v.valor_desconto, 0)) >= 0);"
    )
    cmd_header = f"docker exec {CONTAINER} psql -U coliseu_admin -d coliseu_dashboard -t -c \"{sql_header}\""
    _, stdout, _ = client.exec_command(cmd_header)
    print("=== HEADER SUM (JUNE) ===")
    print(stdout.read().decode('utf-8').strip())
    
    # 2. Items sum for the same sales in June 2026
    sql_items = (
        f"SELECT COALESCE(SUM(vi.valor_total), 0) as items_total "
        f"FROM dash_vendas_itens vi "
        f"JOIN dash_vendas v ON vi.venda_id_firebird = v.id_firebird AND vi.tenant_id = v.tenant_id "
        f"WHERE v.tenant_id = '{TENANT}' "
        f"AND COALESCE(v.data_vencimento, v.data_venda) >= '2026-06-01' "
        f"AND COALESCE(v.data_vencimento, v.data_venda) <= '2026-06-30' "
        f"AND UPPER(TRIM(v.status)) IN ('FATURADO', 'FINALIZADO', 'PROCESSADO') "
        f"AND (UPPER(TRIM(COALESCE(v.especie, ''))) != 'GARANTIA' OR (COALESCE(v.valor_total, 0) - COALESCE(v.valor_desconto, 0)) >= 0);"
    )
    cmd_items = f"docker exec {CONTAINER} psql -U coliseu_admin -d coliseu_dashboard -t -c \"{sql_items}\""
    _, stdout_items, _ = client.exec_command(cmd_items)
    print("=== ITEMS SUM (JUNE) ===")
    print(stdout_items.read().decode('utf-8').strip())
    
except Exception as e:
    print("ERRO:", e)
finally:
    client.close()

import paramiko

HOST = '177.39.17.7'
USER = 'root'
PASS = '6EFBC!c0:wzr%Ij'
CONTAINER = 'coliseu-db-thyqkc5gkvp7i1nld555wakz-172547374937'

def run_query(label, sql):
    sql_escaped = sql.replace('"', '\\"')
    cmd = f'docker exec {CONTAINER} psql -U coliseu_admin -d coliseu_dashboard -c "{sql_escaped}"'
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        client.connect(HOST, username=USER, password=PASS)
        _, stdout, stderr = client.exec_command(cmd)
        out = stdout.read().decode('utf-8')
        err = stderr.read().decode('utf-8')
        print(f"\n=== {label} ===")
        print(out or "(sem resultado)")
        if err.strip():
            print("ERR:", err)
    except Exception as e:
        print(f"[ERRO] {label}: {e}")
    finally:
        client.close()

# 1. Count sales in Janeiro 2026 with status FATURADO/FINALIZADO
run_query(
    "VENDAS JANEIRO 2026",
    """SELECT COUNT(*) as total_vendas, SUM(valor_total) as total_valor
       FROM dash_vendas
       WHERE tenant_id = 'a822a7e7-fdd4-4483-bbb5-26587a72739f'
         AND data_venda >= '2026-01-01' AND data_venda < '2026-02-01'
         AND TRIM(status) IN ('FATURADO', 'FINALIZADO')"""
)

# 2. Count distinct venda_id_firebird in dash_vendas_itens for Jan 2026
run_query(
    "ITENS VINCULADOS A VENDAS JAN 2026",
    """SELECT COUNT(DISTINCT vi.venda_id_firebird) as total_vendas_com_itens, COUNT(*) as total_itens
       FROM dash_vendas_itens vi
       JOIN dash_vendas v ON v.id_firebird = vi.venda_id_firebird AND v.tenant_id = vi.tenant_id
       WHERE vi.tenant_id = 'a822a7e7-fdd4-4483-bbb5-26587a72739f'
         AND v.data_venda >= '2026-01-01' AND v.data_venda < '2026-02-01'
         AND TRIM(v.status) IN ('FATURADO', 'FINALIZADO')"""
)

# 3. Check if there are any items at all in Jan 2026
run_query(
    "AMOSTRA DE ITENS JAN 2026",
    """SELECT vi.venda_id_firebird, vi.produto_id_firebird, vi.marca, vi.categoria, vi.valor_total
       FROM dash_vendas_itens vi
       JOIN dash_vendas v ON v.id_firebird = vi.venda_id_firebird AND v.tenant_id = vi.tenant_id
       WHERE vi.tenant_id = 'a822a7e7-fdd4-4483-bbb5-26587a72739f'
         AND v.data_venda >= '2026-01-01' AND v.data_venda < '2026-02-01'
       LIMIT 5"""
)

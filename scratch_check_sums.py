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

# 1. Total faturamento por status em Jan 2026
run_query(
    "FATURAMENTO POR STATUS JAN 2026",
    """SELECT TRIM(status) as status, COUNT(*) as qtd, SUM(valor_total) as total
       FROM dash_vendas
       WHERE tenant_id = 'a822a7e7-fdd4-4483-bbb5-26587a72739f'
         AND data_venda >= '2026-01-01' AND data_venda < '2026-02-01'
       GROUP BY TRIM(status)"""
)

# 2. Total faturamento sum of sellers in Jan 2026 (joining dash_vendedores)
run_query(
    "FATURAMENTO VENDEDORES EM JAN 2026 - TRADICIONAL",
    """SELECT SUM(v.valor_total) as total
       FROM dash_vendas v
       JOIN dash_vendedores vend ON vend.id_firebird = v.vendedor_id_firebird AND vend.tenant_id = v.tenant_id
       WHERE v.tenant_id = 'a822a7e7-fdd4-4483-bbb5-26587a72739f'
         AND v.data_venda >= '2026-01-01' AND v.data_venda < '2026-02-01'
         AND TRIM(v.status) IN ('FATURADO', 'FINALIZADO')"""
)

run_query(
    "FATURAMENTO VENDEDORES EM JAN 2026 - TODOS STATUS",
    """SELECT SUM(v.valor_total) as total
       FROM dash_vendas v
       JOIN dash_vendedores vend ON vend.id_firebird = v.vendedor_id_firebird AND vend.tenant_id = v.tenant_id
       WHERE v.tenant_id = 'a822a7e7-fdd4-4483-bbb5-26587a72739f'
         AND v.data_venda >= '2026-01-01' AND v.data_venda < '2026-02-01'"""
)

# 3. List top sellers from DB for Jan 2026 with TRIM(status) IN ('FATURADO', 'FINALIZADO')
run_query(
    "TOP VENDEDORES JAN 2026 - TRADICIONAL",
    """SELECT vend.nome, SUM(v.valor_total) as total
       FROM dash_vendas v
       JOIN dash_vendedores vend ON vend.id_firebird = v.vendedor_id_firebird AND vend.tenant_id = v.tenant_id
       WHERE v.tenant_id = 'a822a7e7-fdd4-4483-bbb5-26587a72739f'
         AND v.data_venda >= '2026-01-01' AND v.data_venda < '2026-02-01'
         AND TRIM(v.status) IN ('FATURADO', 'FINALIZADO')
       GROUP BY vend.nome
       ORDER BY total DESC"""
)

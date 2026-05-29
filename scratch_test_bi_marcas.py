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

# 1. Test Marcas query with standard status filter (without CFOP)
run_query(
    "MARCAS QUERY - SEM CFOP",
    """SELECT COALESCE(vi.marca, v.marca, 'S/ MARCA') as nome, 
              SUM(vi.valor_total) as vendas,
              SUM(vi.custo_unitario * vi.quantidade) as custo
       FROM dash_vendas_itens vi
       JOIN dash_vendas v ON v.id_firebird = vi.venda_id_firebird AND v.tenant_id = vi.tenant_id
       WHERE vi.tenant_id = 'a822a7e7-fdd4-4483-bbb5-26587a72739f'
         AND v.data_venda >= '2026-01-01' AND v.data_venda < '2026-02-01'
         AND TRIM(v.status) IN ('FATURADO', 'FINALIZADO')
         AND COALESCE(vi.marca, v.marca) IS NOT NULL AND COALESCE(vi.marca, v.marca) != ''
       GROUP BY COALESCE(vi.marca, v.marca, 'S/ MARCA')
       ORDER BY vendas DESC
       LIMIT 15"""
)

# 2. Test Grupos query with standard status filter
run_query(
    "GRUPOS QUERY - SEM CFOP",
    """SELECT COALESCE(vi.categoria, v.categoria, 'S/ GRUPO') as nome, 
              SUM(vi.valor_total) as vendas,
              SUM(vi.custo_unitario * vi.quantidade) as custo
       FROM dash_vendas_itens vi
       JOIN dash_vendas v ON v.id_firebird = vi.venda_id_firebird AND v.tenant_id = vi.tenant_id
       WHERE vi.tenant_id = 'a822a7e7-fdd4-4483-bbb5-26587a72739f'
         AND v.data_venda >= '2026-01-01' AND v.data_venda < '2026-02-01'
         AND TRIM(v.status) IN ('FATURADO', 'FINALIZADO')
         AND COALESCE(vi.categoria, v.categoria) IS NOT NULL AND COALESCE(vi.categoria, v.categoria) != ''
       GROUP BY COALESCE(vi.categoria, v.categoria, 'S/ GRUPO')
       ORDER BY vendas DESC
       LIMIT 15"""
)

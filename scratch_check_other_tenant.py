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

# 1. Sellers query for the other tenant ed1d3a98
run_query(
    "TENANT ed1d3a98 - TOP VENDEDORES JAN 2026",
    """SELECT vend.nome, SUM(v.valor_total) as total
       FROM dash_vendas v
       JOIN dash_vendedores vend ON vend.id_firebird = v.vendedor_id_firebird AND vend.tenant_id = v.tenant_id
       WHERE v.tenant_id = 'ed1d3a98-4c4d-48db-99c0-8751926eb8e5'
         AND v.data_venda >= '2026-01-01' AND v.data_venda < '2026-02-01'
         AND TRIM(v.status) IN ('FATURADO', 'FINALIZADO')
       GROUP BY vend.nome
       ORDER BY total DESC"""
)

# 2. Total sales for tenant ed1d3a98 in Jan 2026
run_query(
    "TENANT ed1d3a98 - TOTAL FATURADO JAN 2026",
    """SELECT SUM(v.valor_total) as total
       FROM dash_vendas v
       WHERE v.tenant_id = 'ed1d3a98-4c4d-48db-99c0-8751926eb8e5'
         AND v.data_venda >= '2026-01-01' AND v.data_venda < '2026-02-01'
         AND TRIM(v.status) IN ('FATURADO', 'FINALIZADO')"""
)

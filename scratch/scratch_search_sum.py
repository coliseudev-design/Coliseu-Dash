import paramiko

HOST = '177.39.17.7'
USER = 'root'
PASS = '6EFBC!c0:wzr%Ij'
DB_CONTAINER = 'coliseu-db-thyqkc5gkvp7i1nld555wakz-172547374937'

def run_query(label, sql):
    sql_escaped = sql.replace('"', '\\"')
    cmd = f'docker exec {DB_CONTAINER} psql -U coliseu_admin -d coliseu_dashboard -c "{sql_escaped}"'
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        client.connect(HOST, username=USER, password=PASS)
        _, stdout, stderr = client.exec_command(cmd)
        out = stdout.read().decode('utf-8')
        err = stderr.read().decode('utf-8')
        print(f"\n=== {label} ===")
        print(out or "(sem resultado)")
    except Exception as e:
        print(f"[ERRO] {label}: {e}")
    finally:
        client.close()

# 1. Group by month for Vet tenant, count and sum (without CFOP filter)
run_query("VET MONTHLY SUMS (status FATURADO/FINALIZADO)",
          """SELECT TO_CHAR(data_venda, 'YYYY-MM') as mes, COUNT(DISTINCT id_firebird) as count, SUM(valor_total) as total
             FROM dash_vendas
             WHERE tenant_id = 'a822a7e7-fdd4-4483-bbb5-26587a72739f'
               AND TRIM(status) IN ('FATURADO', 'FINALIZADO')
             GROUP BY TO_CHAR(data_venda, 'YYYY-MM')
             ORDER BY mes DESC""")

# 2. Check other tenant ed1d3a98
run_query("COLISEU CLIENT MONTHLY SUMS (status FATURADO/FINALIZADO)",
          """SELECT TO_CHAR(data_venda, 'YYYY-MM') as mes, COUNT(DISTINCT id_firebird) as count, SUM(valor_total) as total
             FROM dash_vendas
             WHERE tenant_id = 'ed1d3a98-4c4d-48db-99c0-8751926eb8e5'
               AND TRIM(status) IN ('FATURADO', 'FINALIZADO')
             GROUP BY TO_CHAR(data_venda, 'YYYY-MM')
             ORDER BY mes DESC""")

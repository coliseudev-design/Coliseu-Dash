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

# 1. Sales for tenant a822a7e7 (Vet Seed)
run_query("VET SEED (a822a7e7) - SUM(valor_total) in Dec 2025 (status FATURADO/FINALIZADO, no CFOP filter)",
          """SELECT COUNT(*) as count, SUM(valor_total) as total
             FROM dash_vendas
             WHERE tenant_id = 'a822a7e7-fdd4-4483-bbb5-26587a72739f'
               AND data_venda >= '2025-12-01 00:00:00' AND data_venda <= '2025-12-31 23:59:59'
               AND TRIM(status) IN ('FATURADO', 'FINALIZADO')""")

# 2. Sales for tenant ed1d3a98 (Coliseu client)
run_query("COLISEU CLIENT (ed1d3a98) - SUM(valor_total) in Dec 2025 (status FATURADO/FINALIZADO)",
          """SELECT COUNT(*) as count, SUM(valor_total) as total
             FROM dash_vendas
             WHERE tenant_id = 'ed1d3a98-4c4d-48db-99c0-8751926eb8e5'
               AND data_venda >= '2025-12-01 00:00:00' AND data_venda <= '2025-12-31 23:59:59'
               AND TRIM(status) IN ('FATURADO', 'FINALIZADO')""")

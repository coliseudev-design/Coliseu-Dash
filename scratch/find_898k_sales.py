import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('177.39.17.7', username='root', password='6EFBC!c0:wzr%Ij')

DB_CONTAINER = "coliseu-db-thyqkc5gkvp7i1nld555wakz-172547374937"

def run_query(label, sql):
    sql_escaped = sql.replace("'", "'\\''")
    cmd = f"docker exec {DB_CONTAINER} psql -U coliseu_admin -d coliseu_dashboard -c '{sql_escaped}'"
    stdin, stdout, stderr = client.exec_command(cmd)
    print(f"=== {label} ===")
    print(stdout.read().decode('utf-8'))

# Let's query both tenants for January 2026 sales sums with different status filters
run_query(
    "Tenant a822a7e7 (Vet Seed) - Statuses in Jan 2026",
    "SELECT TRIM(status) as status, SUM(valor_total) FROM dash_vendas WHERE tenant_id = 'a822a7e7-fdd4-4483-bbb5-26587a72739f' AND data_venda >= '2026-01-01' AND data_venda <= '2026-01-31' GROUP BY TRIM(status)"
)

run_query(
    "Tenant ed1d3a98 (Coliseu) - Statuses in Jan 2026",
    "SELECT TRIM(status) as status, SUM(valor_total) FROM dash_vendas WHERE tenant_id = 'ed1d3a98-4c4d-48db-99c0-8751926eb8e5' AND data_venda >= '2026-01-01' AND data_venda <= '2026-01-31' GROUP BY TRIM(status)"
)

client.close()

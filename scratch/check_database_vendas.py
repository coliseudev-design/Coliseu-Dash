import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('177.39.17.7', username='root', password='6EFBC!c0:wzr%Ij')

DB_CONTAINER = "coliseu-db-thyqkc5gkvp7i1nld555wakz-172547374937"

def run_query(sql, label):
    cmd = f'docker exec {DB_CONTAINER} psql -U coliseu_admin -d coliseu_dashboard -c "{sql}"'
    stdin, stdout, stderr = client.exec_command(cmd)
    print(f"=== {label} ===")
    print(stdout.read().decode('utf-8'))

# Max date in database
run_query(
    "SELECT tenant_id, MAX(data_venda) as max_date, MIN(data_venda) as min_date, COUNT(*) as total_vendas FROM dash_vendas GROUP BY tenant_id;",
    "Date Ranges in dash_vendas"
)

# Query sales for May 2026 - Vetseed
run_query(
    "SELECT TRIM(status) as status, cfop, COUNT(*) as qtd, SUM(valor_total) as valor_total FROM dash_vendas WHERE tenant_id = 'a822a7e7-fdd4-4483-bbb5-26587a72739f' AND data_venda >= '2026-05-01' AND data_venda < '2026-06-01' GROUP BY status, cfop;",
    "Sales in May 2026 (Vetseed)"
)

# Query sales for May 2026 - Tenant ed1d3a98
run_query(
    "SELECT TRIM(status) as status, cfop, COUNT(*) as qtd, SUM(valor_total) as valor_total FROM dash_vendas WHERE tenant_id = 'ed1d3a98-4c4d-48db-99c0-8751926eb8e5' AND data_venda >= '2026-05-01' AND data_venda < '2026-06-01' GROUP BY status, cfop;",
    "Sales in May 2026 (Tenant ed1d3a98)"
)

# Query devolucoes date range and totals
run_query(
    "SELECT tenant_id, MAX(data_devolucao) as max_date, MIN(data_devolucao) as min_date, COUNT(*) as total_devolucoes, SUM(valor) as valor_total FROM dash_devolucoes GROUP BY tenant_id;",
    "Date Ranges in dash_devolucoes"
)

# Query devolucoes for Dec 2025
run_query(
    "SELECT COUNT(*) as qtd, SUM(valor) as valor_total FROM dash_devolucoes WHERE tenant_id = 'a822a7e7-fdd4-4483-bbb5-26587a72739f' AND data_devolucao >= '2025-12-01' AND data_devolucao < '2025-12-31';",
    "Devolucoes in Dec 2025 (Vetseed)"
)

client.close()

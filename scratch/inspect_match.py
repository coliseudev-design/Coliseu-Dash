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

# Query to find any date filter or status combination that results in 1378 rows for any tenant
run_query("""
    SELECT 
        tenant_id,
        status,
        COUNT(*) as count,
        SUM(valor_total) as sum_total
    FROM dash_vendas
    WHERE tenant_id = 'a822a7e7-fdd4-4483-bbb5-26587a72739f'
      AND data_venda >= '2025-01-01'
    GROUP BY tenant_id, status;
""", "a822a7e7 sales from 2025-01-01")

# Query sales count and sum for a822a7e7 in 2025
run_query("""
    SELECT 
        COUNT(*) as count,
        SUM(valor_total) as sum_total
    FROM dash_vendas
    WHERE tenant_id = 'a822a7e7-fdd4-4483-bbb5-26587a72739f'
      AND TRIM(status) IN ('FATURADO', 'FINALIZADO')
      AND data_venda >= '2025-01-01' AND data_venda <= '2025-12-31';
""", "a822a7e7 FATURADO/FINALIZADO in 2025")

# Query sales count and sum for a822a7e7 in 2026
run_query("""
    SELECT 
        COUNT(*) as count,
        SUM(valor_total) as sum_total
    FROM dash_vendas
    WHERE tenant_id = 'a822a7e7-fdd4-4483-bbb5-26587a72739f'
      AND TRIM(status) IN ('FATURADO', 'FINALIZADO')
      AND data_venda >= '2026-01-01' AND data_venda <= '2026-05-31';
""", "a822a7e7 FATURADO/FINALIZADO in 2026")

# Let's search if there's any other tenant in dash_usuarios that has layout_version='v4.0'
run_query("""
    SELECT tenant_id, nome, email, layout_version FROM dash_usuarios WHERE layout_version='v4.0';
""", "Users with Layout v4.0")

client.close()

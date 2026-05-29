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

# Query for tenant ed1d3a98
run_query(
    "Vendedores Jan 2026 (Coliseu Tenant)",
    """SELECT COALESCE(vend.nome, 'Vendedor ' || v.vendedor_id_firebird) as nome, SUM(v.valor_total) as total
       FROM dash_vendas v
       LEFT JOIN dash_vendedores vend ON vend.id_firebird = v.vendedor_id_firebird AND vend.tenant_id = v.tenant_id
       WHERE v.tenant_id = 'ed1d3a98-4c4d-48db-99c0-8751926eb8e5'
         AND v.data_venda >= '2026-01-01' AND v.data_venda <= '2026-01-31'
         AND TRIM(v.status) IN ('FATURADO', 'FINALIZADO')
       GROUP BY v.vendedor_id_firebird, vend.nome
       ORDER BY total DESC"""
)

# Total faturamento for Coliseu Tenant in Jan 2026
run_query(
    "Faturamento Total Jan 2026 (Coliseu Tenant)",
    """SELECT SUM(v.valor_total)
       FROM dash_vendas v
       WHERE v.tenant_id = 'ed1d3a98-4c4d-48db-99c0-8751926eb8e5'
         AND v.data_venda >= '2026-01-01' AND v.data_venda <= '2026-01-31'
         AND TRIM(v.status) IN ('FATURADO', 'FINALIZADO')"""
)

client.close()

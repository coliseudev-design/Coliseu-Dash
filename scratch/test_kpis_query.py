import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('177.39.17.7', username='root', password='6EFBC!c0:wzr%Ij')

DB_CONTAINER = "coliseu-db-thyqkc5gkvp7i1nld555wakz-172547374937"

def run_query(sql, db="coliseu_dashboard"):
    sql_escaped = sql.replace("'", "'\\''")
    cmd = f"docker exec {DB_CONTAINER} psql -U coliseu_admin -d {db} -t -A -c '{sql_escaped}'"
    stdin, stdout, stderr = client.exec_command(cmd)
    res = stdout.read().decode('utf-8').strip()
    err = stderr.read().decode('utf-8').strip()
    if err:
        print(f"ERR for {sql[:60]}: {err}")
    return res

# Let's test for Tenant a822a7e7-fdd4-4483-bbb5-26587a72739f (Coliseu dev)
tenant_id = 'a822a7e7-fdd4-4483-bbb5-26587a72739f'
# Let's find max date
max_date = run_query(f"SELECT MAX(data_venda) FROM dash_vendas WHERE tenant_id = '{tenant_id}'")
print(f"Max Date: {max_date}")

# Let's assume start = '2026-04-01 00:00:00' and end = '2026-04-30 23:59:59'
start = '2026-04-01 00:00:00'
end = '2026-04-30 23:59:59'

# Status filter clause from cfopUtil:
# getStatusFilterClause returns: AND TRIM(v.status) IN ('FATURADO', 'FINALIZADO')
# getSalesFilterClause returns: AND TRIM(v.status) IN ('FATURADO', 'FINALIZADO')
sales_filter = "AND TRIM(v.status) IN ('FATURADO', 'FINALIZADO')"

# Query 1: recent orders
recent_sql = f"""
SELECT COUNT(*), SUM(v.valor_total)
FROM dash_vendas v
WHERE v.tenant_id = '{tenant_id}' AND v.data_venda >= '{start}' AND v.data_venda <= '{end}'
  {sales_filter}
"""
print("Recent Orders with filter:")
print(run_query(recent_sql))

recent_no_filter = f"""
SELECT COUNT(*), SUM(v.valor_total)
FROM dash_vendas v
WHERE v.tenant_id = '{tenant_id}' AND v.data_venda >= '{start}' AND v.data_venda <= '{end}'
"""
print("Recent Orders WITHOUT status filter:")
print(run_query(recent_no_filter))

# Query 2: All status and count in that period
status_group = f"""
SELECT TRIM(v.status), COUNT(*), SUM(v.valor_total)
FROM dash_vendas v
WHERE v.tenant_id = '{tenant_id}' AND v.data_venda >= '{start}' AND v.data_venda <= '{end}'
GROUP BY 1
"""
print("Status grouping:")
print(run_query(status_group))

client.close()

import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('2.24.82.19', username='root', password='Col@13894645')

db_container = 'vasjsucz4yxcb7m4rtqindd2'

def run_query(db_name, sql):
    sql_escaped = sql.replace("'", "'\\''")
    cmd = f"docker exec {db_container} psql -U coliseu_admin -d {db_name} -c '{sql_escaped}' 2>&1"
    stdin, stdout, stderr = client.exec_command(cmd)
    out = stdout.read().decode('utf-8')
    return out

print("=== KILLING SLOW TOP PRODUCT QUERIES ===")
sql = "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE query LIKE '%SELECT COALESCE(vi.produto, p.nome%' AND pid != pg_backend_pid()"
print(run_query("coliseu_dashboard", sql))

client.close()

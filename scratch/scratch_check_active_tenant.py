import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('177.39.17.7', username='root', password='6EFBC!c0:wzr%Ij')

db_container = 'coliseu-db-thyqkc5gkvp7i1nld555wakz-172547374937'

def run_query(db_name, sql):
    sql_escaped = sql.replace("'", "'\\''")
    cmd = f"docker exec {db_container} psql -U coliseu_admin -d {db_name} -c '{sql_escaped}' 2>&1"
    stdin, stdout, stderr = client.exec_command(cmd)
    out = stdout.read().decode('utf-8')
    return out

print("=== ACTIVE TENANTS IN dash_vendas ===")
print(run_query("coliseu_dashboard", "SELECT tenant_id, count(*) FROM dash_vendas GROUP BY 1"))
client.close()

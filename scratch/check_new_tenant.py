import paramiko
client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('177.39.17.7', username='root', password='6EFBC!c0:wzr%Ij')

def run_query(sql, db="coliseu_dashboard"):
    sql_escaped = sql.replace("'", "'\\''")
    cmd = f"docker exec coliseu-db-thyqkc5gkvp7i1nld555wakz-172547374937 psql -U coliseu_admin -d {db} -c '{sql_escaped}'"
    stdin, stdout, stderr = client.exec_command(cmd)
    print(f"=== DB: {db} ===")
    print(stdout.read().decode('utf-8'))
    err = stderr.read().decode('utf-8')
    if err.strip():
        print("ERR:", err)

# Check coliseu_dashboard
run_query("SELECT id, tenant_id, email, nome, role, layout_version FROM dash_usuarios WHERE tenant_id = '816f97c4-66fb-4ef8-905d-e0551cbf2492'")
# Check coliseu_identity companies
run_query("SELECT * FROM companies WHERE \"Id\" = '816f97c4-66fb-4ef8-905d-e0551cbf2492'", db="coliseu_identity")

client.close()

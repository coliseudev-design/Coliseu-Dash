import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
try:
    client.connect('2.24.82.19', username='root', password='Col@13894645', timeout=10)
    print("Connected to VPS")
except Exception as e:
    print("Failed to connect:", e)
    exit(1)

def run_query(container, db, sql):
    sql_escaped = sql.replace("'", "'\\''")
    cmd = f"docker exec {container} psql -U coliseu_admin -d {db} -c '{sql_escaped}'"
    print(f"\n--- Running: {cmd} ---")
    stdin, stdout, stderr = client.exec_command(cmd)
    out = stdout.read().decode('utf-8')
    err = stderr.read().decode('utf-8')
    if out:
        print("STDOUT:")
        print(out)
    if err:
        print("STDERR:")
        print(err)

db_container = "vasjsucz4yxcb7m4rtqindd2"

# Check the database schemas
run_query(db_container, "coliseu_dashboard", "SELECT id, tenant_id, email, nome, role, layout_version, ativo FROM dash_usuarios")

client.close()

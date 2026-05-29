import paramiko

HOST = '177.39.17.7'
USER = 'root'
PASS = '6EFBC!c0:wzr%Ij'
CONTAINER = 'coliseu-db-thyqkc5gkvp7i1nld555wakz-172547374937'

def run_query(db, sql):
    sql_escaped = sql.replace('"', '\\"')
    cmd = f'docker exec {CONTAINER} psql -U coliseu_admin -d {db} -t -c "{sql_escaped}"'
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        client.connect(HOST, username=USER, password=PASS)
        _, stdout, stderr = client.exec_command(cmd)
        out = stdout.read().decode('utf-8').strip()
        return out
    except Exception as e:
        return f"ERROR: {e}"
    finally:
        client.close()

# 1. Search in companies in identity
print("Search companies in identity:")
print(run_query("coliseu_identity", "SELECT * FROM companies WHERE \"Name\" ILIKE '%fracasso%'"))

# 2. Search in usuarios in dashboard
print("Search usuarios in dashboard:")
print(run_query("coliseu_dashboard", "SELECT * FROM dash_usuarios WHERE nome ILIKE '%fracasso%' OR email ILIKE '%fracasso%'"))

# 3. Search in users in identity
print("Search users in identity:")
print(run_query("coliseu_identity", "SELECT * FROM admin_users WHERE \"Name\" ILIKE '%fracasso%' OR \"Email\" ILIKE '%fracasso%'"))

# 4. Search in dash_vendedores
print("Search in dash_vendedores:")
print(run_query("coliseu_dashboard", "SELECT DISTINCT tenant_id, nome FROM dash_vendedores WHERE nome ILIKE '%fracasso%'"))

# 5. Let's list all tenants in dash_usuarios and see their names
print("All users in dash_usuarios:")
print(run_query("coliseu_dashboard", "SELECT tenant_id, nome, email, layout_version FROM dash_usuarios"))

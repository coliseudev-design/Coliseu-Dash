import paramiko
import json

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('2.24.82.19', username='root', password='Col@13894645', timeout=10)

def run_query(db, sql):
    # Pass SQL via stdin to avoid shell escaping issues
    cmd = f"docker exec -i 10623a640fab psql -U coliseu_admin -d {db} -t"
    stdin, stdout, stderr = client.exec_command(cmd)
    stdin.write(sql)
    stdin.close()
    output = stdout.read().decode('utf-8').strip()
    err = stderr.read().decode('utf-8').strip()
    if err:
        print(f"DB Error on {db}: {err}")
    return [line.strip() for line in output.split('\n') if line.strip()]

# 1. Fetch active company IDs from Identity DB (EF Core maps UUID to "Id")
active_ids_raw = run_query("coliseu_identity", 'SELECT "Id" FROM companies;')
print(f"Total active companies in Identity: {len(active_ids_raw)}")

# Convert to a set of lower-case strings
active_ids = {id_str.lower() for id_str in active_ids_raw}

# 2. Find all tables in coliseu_dashboard that have tenant_id column
tables = run_query("coliseu_dashboard", "SELECT table_name FROM information_schema.columns WHERE column_name = 'tenant_id' AND table_schema = 'public';")

# 3. Query all unique tenant_ids currently present in coliseu_dashboard
all_db_tenants = set()
for table in tables:
    tenants = run_query("coliseu_dashboard", f"SELECT DISTINCT tenant_id FROM {table};")
    for t in tenants:
        if t:
            all_db_tenants.add(t.lower())

print(f"Total unique tenant_ids in Dashboard DB: {len(all_db_tenants)}")

# 4. Identify orphaned tenants
orphans = all_db_tenants - active_ids
# Keep 00000000-0000-0000-0000-000000000000 (Super Admin default) out of orphans
orphans.discard("00000000-0000-0000-0000-000000000000")

print("\n--- ORPHANED TENANTS FOUND ---")
if orphans:
    for orphan in orphans:
        # Get some details if they exist in dash_usuarios
        user_info = run_query("coliseu_dashboard", f"SELECT email, nome FROM dash_usuarios WHERE tenant_id = '{orphan}' LIMIT 5;")
        print(f"Tenant ID: {orphan}")
        if user_info:
            print(f"  Associated Users: {', '.join(user_info)}")
        else:
            print("  No users found in dash_usuarios")
else:
    print("No orphaned tenants found!")

client.close()

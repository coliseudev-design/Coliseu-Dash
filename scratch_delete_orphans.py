import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('2.24.82.19', username='root', password='Col@13894645', timeout=10)

orphans = [
    "c06a45f5-fd16-4f8c-92b6-af73c00ca278",
    "165ee946-2e92-45b7-9f10-70589f1cc023",
    "e9ab01b3-b334-4045-8863-b755b30b747f",
    "fc5d801e-3c31-4cd1-9ff0-d9093a9caedd",
    "3edd56b4-e002-48ed-8ecb-131c0c62dcfb",
    "c824cac2-6f4e-4871-a3d8-664c149e5f75",
    "ed1d3a98-4c4d-48db-99c0-8751926eb8e5",
    "8095a00c-7fe6-4e7d-9540-c766a53de764",
    "a7e19364-b0aa-473a-be9e-7f9b6f27d15e",
    "6128eb0f-386a-4eec-9ad0-c5cfe2f59263",
    "946016b6-1815-4e2b-b078-a7b5a02e3550",
    "816f97c4-66fb-4ef8-905d-e0551cbf2492",
    "4c403359-e245-48c3-b924-a249c40670a6"
]

def run_query(db, sql):
    cmd = f"docker exec -i 10623a640fab psql -U coliseu_admin -d {db} -t"
    stdin, stdout, stderr = client.exec_command(cmd)
    stdin.write(sql)
    stdin.close()
    output = stdout.read().decode('utf-8').strip()
    err = stderr.read().decode('utf-8').strip()
    if err:
        print(f"DB Error on {db}: {err}")
    return [line.strip() for line in output.split('\n') if line.strip()]

# 1. Find all tables in coliseu_dashboard that have tenant_id column
tables = run_query("coliseu_dashboard", "SELECT table_name FROM information_schema.columns WHERE column_name = 'tenant_id' AND table_schema = 'public';")

print(f"Starting cleanup of {len(orphans)} orphaned tenants across {len(tables)} tables...")

for orphan in orphans:
    print(f"\nCleaning Tenant: {orphan}")
    for table in tables:
        # Get count before delete
        count_res = run_query("coliseu_dashboard", f"SELECT COUNT(*) FROM {table} WHERE tenant_id = '{orphan}';")
        count = int(count_res[0]) if count_res else 0
        if count > 0:
            # Delete
            del_res = run_query("coliseu_dashboard", f"DELETE FROM {table} WHERE tenant_id = '{orphan}';")
            print(f"  - Table {table}: deleted {count} records.")

print("\nCleanup completed successfully.")
client.close()

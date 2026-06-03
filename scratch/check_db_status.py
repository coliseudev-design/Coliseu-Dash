import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('177.39.17.7', username='root', password='6EFBC!c0:wzr%Ij')

DB_CONTAINER = "coliseu-db-thyqkc5gkvp7i1nld555wakz-172547374937"

def run_query(sql, db="coliseu_dashboard"):
    sql_escaped = sql.replace("'", "'\\''")
    cmd = f"docker exec {DB_CONTAINER} psql -U coliseu_admin -d {db} -c '{sql_escaped}'"
    stdin, stdout, stderr = client.exec_command(cmd)
    print(f"=== DB: {db} ===")
    print(stdout.read().decode('utf-8'))
    err = stderr.read().decode('utf-8')
    if err.strip():
        print("ERR:", err)

print("--- USERS ---")
run_query("SELECT id, tenant_id, email, nome, layout_version, use_vet_db, role, ativo FROM dash_usuarios")

print("--- VENDAS STATUS (MAIN DB) ---")
run_query("SELECT tenant_id, TRIM(status) as status, COUNT(*), MIN(data_venda), MAX(data_venda) FROM dash_vendas GROUP BY tenant_id, TRIM(status)")

print("--- VENDAS STATUS (VET DB) ---")
run_query("SELECT tenant_id, TRIM(status) as status, COUNT(*), MIN(data_venda), MAX(data_venda) FROM dash_vendas GROUP BY tenant_id, TRIM(status)", db="coliseu_dashboard_vet")

client.close()

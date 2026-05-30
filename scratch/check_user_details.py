import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('177.39.17.7', username='root', password='6EFBC!c0:wzr%Ij')

def run_coolify_db_query(sql, db):
    sql_escaped = sql.replace("'", "'\\''")
    cmd = f"docker exec coolify-db psql -U coolify -d {db} -c '{sql_escaped}'"
    stdin, stdout, stderr = client.exec_command(cmd)
    print(f"=== coolify-db: {db} ===")
    print(stdout.read().decode('utf-8'))
    err = stderr.read().decode('utf-8')
    if err.strip():
        print("ERR:", err)

print("--- BUSCANDO NA BASE MAIN DO coolify-db ---")
run_coolify_db_query("SELECT id, tenant_id, email, nome, layout_version, role, grupo_id, ativo FROM dash_usuarios WHERE nome ILIKE '%teste%' OR email ILIKE '%teste%'", "coliseu_dashboard")

print("--- BUSCANDO NA BASE VET DO coolify-db ---")
run_coolify_db_query("SELECT id, tenant_id, email, nome, layout_version, role, grupo_id, ativo FROM dash_usuarios WHERE nome ILIKE '%teste%' OR email ILIKE '%teste%'", "coliseu_dashboard_vet")

client.close()

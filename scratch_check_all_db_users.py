import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('177.39.17.7', username='root', password='6EFBC!c0:wzr%Ij')

DB_CONTAINER = "coliseu-db-thyqkc5gkvp7i1nld555wakz-172547374937"

def run_query(sql, db="coliseu_dashboard"):
    sql_escaped = sql.replace("'", "'\\''")
    cmd = f"docker exec {DB_CONTAINER} psql -U coliseu_admin -d {db} -c '{sql_escaped}'"
    stdin, stdout, stderr = client.exec_command(cmd)
    out = stdout.read().decode('utf-8')
    err = stderr.read().decode('utf-8')
    return f"=== DB: {db} ===\nSQL: {sql}\nOUT:\n{out}\nERR:\n{err}\n"

with open("scratch_db_dump.txt", "w", encoding="utf-8") as f:
    f.write(run_query("SELECT id, tenant_id, email, nome, role, layout_version, ativo FROM dash_usuarios", db="coliseu_dashboard"))
    f.write(run_query("SELECT * FROM admin_users", db="coliseu_identity"))
    f.write(run_query("SELECT * FROM companies", db="coliseu_identity"))

client.close()
print("Saved to scratch_db_dump.txt")

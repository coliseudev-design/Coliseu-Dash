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

run_query("SELECT id, tenant_id, email, nome, role, layout_version, ativo FROM dash_usuarios WHERE email LIKE '%thiago%' OR email LIKE '%vet%'", db="coliseu_dashboard")
run_query("SELECT \"Id\", \"CompanyId\", \"Email\", \"Name\" FROM admin_users WHERE \"Email\" LIKE '%thiago%' OR \"Email\" LIKE '%vet%'", db="coliseu_identity")
client.close()

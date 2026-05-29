import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('177.39.17.7', username='root', password='6EFBC!c0:wzr%Ij')

DB_CONTAINER = "coliseu-db-thyqkc5gkvp7i1nld555wakz-172547374937"

def run_query(db, sql):
    sql_escaped = sql.replace("'", "'\\''")
    cmd = f"docker exec {DB_CONTAINER} psql -U coliseu_admin -d {db} -c '{sql_escaped}'"
    stdin, stdout, stderr = client.exec_command(cmd)
    out = stdout.read().decode('utf-8')
    err = stderr.read().decode('utf-8')
    if out.strip() and "0 rows" not in out:
        print(f"=== DB: {db} ===")
        print(out)
    if err.strip():
        print(f"=== DB: {db} ERR ===")
        print(err)

# Let's search all tables in coliseu_dashboard
run_query("coliseu_dashboard", "SELECT * FROM dash_usuarios WHERE email LIKE '%thiago%' OR email LIKE '%vet%'")
run_query("coliseu_identity", "SELECT * FROM admin_users WHERE \"Email\" LIKE '%thiago%' OR \"Email\" LIKE '%vet%'")

client.close()

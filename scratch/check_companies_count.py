import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('177.39.17.7', username='root', password='6EFBC!c0:wzr%Ij')

DB_CONTAINER = "coliseu-db-thyqkc5gkvp7i1nld555wakz-172547374937"

def run_query(sql, db="coliseu_identity"):
    sql_escaped = sql.replace("'", "'\\''")
    cmd = f"docker exec {DB_CONTAINER} psql -U coliseu_admin -d {db} -c '{sql_escaped}'"
    stdin, stdout, stderr = client.exec_command(cmd)
    print(stdout.read().decode('utf-8'))
    err = stderr.read().decode('utf-8')
    if err:
        print("ERR:", err)

print("=== Companies Columns ===")
run_query("SELECT * FROM companies LIMIT 1")

print("=== All Companies ===")
run_query("SELECT id, name FROM companies")

print("=== Company Modules ===")
run_query("SELECT * FROM company_modules LIMIT 3")
client.close()

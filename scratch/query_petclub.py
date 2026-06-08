import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('177.39.17.7', username='root', password='6EFBC!c0:wzr%Ij')

DB_CONTAINER = "coolify-db"

def run_query(sql, db="postgres"):
    sql_escaped = sql.replace("'", "'\\''")
    cmd = f"docker exec {DB_CONTAINER} psql -U postgres -d {db} -c '{sql_escaped}'"
    stdin, stdout, stderr = client.exec_command(cmd)
    print(f"=== DB: {db} | Query: {sql} ===")
    print(stdout.read().decode('utf-8'))
    err = stderr.read().decode('utf-8')
    if err.strip():
        print("ERR:", err)

# List databases in coolify-db
run_query("SELECT datname FROM pg_database WHERE datistemplate = false")

client.close()

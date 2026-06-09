import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('2.24.82.19', username='root', password='Col@13894645', timeout=10)

def run_query(db, query_str):
    cmd = f"docker exec vasjsucz4yxcb7m4rtqindd2 psql -U coliseu_admin -d {db} -c \"{query_str}\""
    stdin, stdout, stderr = client.exec_command(cmd)
    out = stdout.read().decode('utf-8')
    err = stderr.read().decode('utf-8')
    print(f"=== DB: {db} | Query: {query_str} ===")
    if out:
        print(out)
    if err:
        print("ERR:", err)

# List all fields in companies
run_query("coliseu_identity", "SELECT * FROM companies;")

# List all fields in company_modules
run_query("coliseu_identity", "SELECT * FROM company_modules;")

client.close()

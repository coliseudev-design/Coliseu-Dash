import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('177.39.17.7', username='root', password='6EFBC!c0:wzr%Ij')

DB_CONTAINER = "coliseu-db-thyqkc5gkvp7i1nld555wakz-172547374937"

def run_query(db_name, sql, label):
    cmd = f'docker exec {DB_CONTAINER} psql -U coliseu_admin -d {db_name} -c "{sql}"'
    stdin, stdout, stderr = client.exec_command(cmd)
    print(f"=== {label} ===")
    print(stdout.read().decode('utf-8'))

run_query("coliseu_identity", "SELECT table_name FROM information_schema.tables WHERE table_schema='public';", "Identity Tables")
run_query("coliseu_identity", "SELECT id, name, cnpj FROM companies;", "Companies in Identity")
run_query("coliseu_identity", "SELECT id, name, email, company_id FROM users;", "Users in Identity")

client.close()

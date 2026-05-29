import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('177.39.17.7', username='root', password='6EFBC!c0:wzr%Ij')

DB_CONTAINER = "coliseu-db-thyqkc5gkvp7i1nld555wakz-172547374937"

def run_cmd(cmd):
    stdin, stdout, stderr = client.exec_command(cmd)
    print(f"=== CMD: {cmd} ===")
    out = stdout.read().decode('utf-8')
    err = stderr.read().decode('utf-8')
    if out.strip():
        print("STDOUT:", out)
    if err.strip():
        print("STDERR:", err)

# Create the database coliseu_dashboard_vet
run_cmd(f'docker exec {DB_CONTAINER} psql -U coliseu_admin -d postgres -c "CREATE DATABASE coliseu_dashboard_vet;"')

# List databases to verify
run_cmd(f'docker exec {DB_CONTAINER} psql -U coliseu_admin -d postgres -c "SELECT datname FROM pg_database WHERE datistemplate = false;"')

client.close()

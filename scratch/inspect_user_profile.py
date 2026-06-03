import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('177.39.17.7', username='root', password='6EFBC!c0:wzr%Ij')

DB_CONTAINER = 'coliseu-db-thyqkc5gkvp7i1nld555wakz-172547374937'

def run_query(sql, label):
    cmd = f'docker exec {DB_CONTAINER} psql -U coliseu_admin -d coliseu_dashboard_vet -c "{sql}"'
    stdin, stdout, stderr = client.exec_command(cmd)
    print(f"\n=== {label} ===")
    print(stdout.read().decode('utf-8'))
    err = stderr.read().decode('utf-8')
    if err:
        print("ERR:", err)

# Inspect user TESTE PET or all users
run_query("SELECT id, tenant_id, email, nome, role, layout_version, use_vet_db FROM dash_usuarios;", "USER PROFILES")

client.close()

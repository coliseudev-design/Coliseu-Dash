import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('177.39.17.7', username='root', password='6EFBC!c0:wzr%Ij')

DB_CONTAINER = "coliseu-db-thyqkc5gkvp7i1nld555wakz-172547374937"

def run_query(sql, label):
    cmd = f'docker exec {DB_CONTAINER} psql -U coliseu_admin -d coliseu_dashboard -c "{sql}"'
    stdin, stdout, stderr = client.exec_command(cmd)
    print(f"=== {label} ===")
    print(stdout.read().decode('utf-8'))

# Search for Vetseed or other tenant details
run_query("SELECT id, nome, razao_social, cnpj FROM dash_empresas WHERE nome ILIKE '%vetseed%' OR razao_social ILIKE '%vetseed%';", "dash_empresas")
run_query("SELECT id, nome, email, tenant_id FROM dash_usuarios WHERE nome ILIKE '%vetseed%' OR email ILIKE '%vetseed%';", "dash_usuarios")
run_query("SELECT DISTINCT tenant_id FROM dash_vendas;", "Distinct Tenants in Sales")

client.close()

import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('177.39.17.7', username='root', password='6EFBC!c0:wzr%Ij')

DB_CONTAINER = "coliseu-db-thyqkc5gkvp7i1nld555wakz-172547374937"

def run_query(sql, db="coliseu_dashboard_vet"):
    sql_escaped = sql.replace("'", "'\\''")
    cmd = f"docker exec {DB_CONTAINER} psql -U coliseu_admin -d {db} -c '{sql_escaped}'"
    stdin, stdout, stderr = client.exec_command(cmd)
    print(f"=== DB: {db} ===")
    print(stdout.read().decode('utf-8'))

run_query("SELECT id, tenant_id, email, nome, layout_version, ativo FROM dash_usuarios", db="coliseu_dashboard_vet")
run_query("SELECT \"Id\", \"CompanyId\", \"Email\", \"Name\" FROM admin_users WHERE \"Email\" = 'thiago@vet.com.br'", db="coliseu_identity")
run_query("SELECT \"Id\", \"Name\" FROM companies WHERE \"Id\"::text = '3edd56b4-e002-48ed-8ecb-131c0c62dcfb'", db="coliseu_identity")
client.close()

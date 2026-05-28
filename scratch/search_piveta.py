import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('177.39.17.7', username='root', password='6EFBC!c0:wzr%Ij')

DB_CONTAINER = "coliseu-db-thyqkc5gkvp7i1nld555wakz-172547374937"

def run_query(sql):
    cmd = f'docker exec {DB_CONTAINER} psql -U coliseu_admin -d coliseu_dashboard -t -A -c "{sql}"'
    stdin, stdout, stderr = client.exec_command(cmd)
    res = stdout.read().decode('utf-8').strip()
    return res

# 1. Print matching dash_vendedores
vendedores_sql = "SELECT id_firebird, nome, tenant_id FROM dash_vendedores WHERE nome ILIKE '%Piveta%';"
print("=== Vendedores matching Piveta ===")
print(run_query(vendedores_sql))

# 2. Print matching dash_clientes
clientes_sql = "SELECT id_firebird, nome, tenant_id, cidade FROM dash_clientes WHERE nome ILIKE '%Piveta%';"
print("=== Clientes matching Piveta ===")
print(run_query(clientes_sql))

client.close()

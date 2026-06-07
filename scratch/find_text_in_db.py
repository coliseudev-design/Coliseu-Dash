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

# Search for the client names in dash_clientes
run_query("SELECT tenant_id, id_firebird, nome FROM dash_clientes WHERE nome ILIKE '%rachel%' OR nome ILIKE '%ubirajara%' OR nome ILIKE '%diagone%';", "Searching dash_clientes")

# Search for the client names in dash_vendas (maybe they are stored as client name or in some other column?)
run_query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'dash_vendas';", "dash_vendas Columns")

client.close()

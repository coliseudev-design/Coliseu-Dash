import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('177.39.17.7', username='root', password='6EFBC!c0:wzr%Ij')

DB_CONTAINER = "coliseu-db-thyqkc5gkvp7i1nld555wakz-172547374937"

def run_query(db, sql, label):
    cmd = f'docker exec {DB_CONTAINER} psql -U coliseu_admin -d {db} -c "{sql}"'
    stdin, stdout, stderr = client.exec_command(cmd)
    print(f"=== {label} ({db}) ===")
    print(stdout.read().decode('utf-8'))

# Search in coliseu_dashboard
run_query("coliseu_dashboard", "SELECT tenant_id, id_firebird, nome FROM dash_clientes WHERE nome ILIKE '%LUIZ CARLOS%';", "LUIZ CARLOS clients")
run_query("coliseu_dashboard", "SELECT tenant_id, id_firebird, nome FROM dash_clientes WHERE nome ILIKE '%JERRY%';", "JERRY clients")
run_query("coliseu_dashboard", "SELECT tenant_id, id_firebird, nome FROM dash_clientes WHERE nome ILIKE '%LHASA%';", "LHASA clients")

# Search in coliseu_dashboard_vet
run_query("coliseu_dashboard_vet", "SELECT tenant_id, id_firebird, nome FROM dash_clientes WHERE nome ILIKE '%LUIZ CARLOS%';", "LUIZ CARLOS clients")
run_query("coliseu_dashboard_vet", "SELECT tenant_id, id_firebird, nome FROM dash_clientes WHERE nome ILIKE '%JERRY%';", "JERRY clients")
run_query("coliseu_dashboard_vet", "SELECT tenant_id, id_firebird, nome FROM dash_clientes WHERE nome ILIKE '%LHASA%';", "LHASA clients")

client.close()

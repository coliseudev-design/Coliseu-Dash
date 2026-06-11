import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('177.39.17.7', username='root', password='6EFBC!c0:wzr%Ij')

DB = "coliseu-db-thyqkc5gkvp7i1nld555wakz-172547374937"

def pg(database, sql, label):
    sql_escaped = sql.replace('"', '\\"')
    cmd = f'docker exec {DB} psql -U coliseu_admin -d {database} -c "{sql_escaped}" 2>&1'
    stdin, stdout, stderr = client.exec_command(cmd)
    print(f"\n=== {label} ({database}) ===")
    print(stdout.read().decode('utf-8'))

for db in ["coliseu_dashboard", "coliseu_dashboard_vet"]:
    pg(
        db,
        "SELECT id_firebird, nome, tenant_id FROM dash_clientes WHERE nome ILIKE '%VITOR RENAN%' OR nome ILIKE '%ARQUITETURA%' OR nome ILIKE '%HOKI%' OR nome ILIKE '%CONSUMIDOR%';",
        "Buscar clientes"
    )

client.close()

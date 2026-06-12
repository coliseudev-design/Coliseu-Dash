import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('2.24.82.19', username='root', password='Col@13894645')

# List all containers
stdin, stdout, stderr = client.exec_command("docker ps --format '{{.Names}}'")
containers = stdout.read().decode('utf-8').strip().split('\n')
print("Running Containers:", containers)

# Try to find the DB container (it usually contains 'db' but not 'backup')
db_containers = [c for c in containers if 'db' in c and 'backup' not in c]
if not db_containers:
    db_containers = [c for c in containers if 'db' in c]
db_container = db_containers[0] if db_containers else None
print("Selected DB Container:", db_container)

if db_container:
    tenant_id = '1ca30f62-4487-4103-b529-c6d7b041b245'
    tables = [
        'dash_sync_metadata', 'dash_clientes', 'dash_produtos', 'dash_vendedores', 
        'dash_devolucoes', 'dash_vendas', 'dash_vendas_itens', 'dash_financeiro'
    ]

    sql = ""
    for t in tables:
        sql += f"SELECT '{t}' AS tabela, COUNT(*) FROM {t} WHERE tenant_id = '{tenant_id}' UNION ALL\n"
    sql = sql[:-11] + ";"

    cmd = f'docker exec -i {db_container} psql -U coliseu_admin -d coliseu_dashboard -c "{sql}"'
    stdin, stdout, stderr = client.exec_command(cmd)
    print("STDOUT:")
    print(stdout.read().decode('utf-8'))
    print("STDERR:")
    print(stderr.read().decode('utf-8'))

client.close()

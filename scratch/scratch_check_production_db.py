import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('2.24.82.19', username='root', password='Col@13894645')

print("=== ALL CONTAINERS ON 2.24.82.19 ===")
stdin, stdout, stderr = client.exec_command("docker ps --format '{{.Names}}'")
print(stdout.read().decode('utf-8'))

# Run a query inside the local postgres container if it exists
stdin, stdout, stderr = client.exec_command("docker ps --format '{{.Names}}' | grep 'db'")
db_containers = stdout.read().decode('utf-8').strip().split('\n')
db_container = db_containers[0] if db_containers[0] else None

if db_container:
    print(f"Found DB container: {db_container}")
    sql = "SELECT tenant_id, count(*), min(data_hora_proc), max(data_hora_proc) FROM dash_vendas GROUP BY 1"
    sql_escaped = sql.replace("'", "'\\''")
    cmd = f"docker exec {db_container} psql -U coliseu_admin -d coliseu_dashboard -c '{sql_escaped}' 2>&1"
    stdin, stdout, stderr = client.exec_command(cmd)
    print(stdout.read().decode('utf-8'))
    
    print("=== RECENT SALES WITH data_hora_proc ===")
    sql = "SELECT id_firebird, status, data_venda, data_hora_proc, valor_total FROM dash_vendas ORDER BY data_hora_proc DESC NULLS LAST LIMIT 10"
    sql_escaped = sql.replace("'", "'\\''")
    cmd = f"docker exec {db_container} psql -U coliseu_admin -d coliseu_dashboard -c '{sql_escaped}' 2>&1"
    stdin, stdout, stderr = client.exec_command(cmd)
    print(stdout.read().decode('utf-8'))
else:
    print("No DB container found on 2.24.82.19!")

client.close()

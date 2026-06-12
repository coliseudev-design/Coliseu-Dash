import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('2.24.82.19', username='root', password='Col@13894645')

db_container = 'vasjsucz4yxcb7m4rtqindd2'

def run_query(sql, label):
    cmd = f'docker exec -i {db_container} psql -U coliseu_admin -d coliseu_dashboard -c "{sql}"'
    stdin, stdout, stderr = client.exec_command(cmd)
    print(f"=== {label} ===")
    print(stdout.read().decode('utf-8'))
    err = stderr.read().decode('utf-8')
    if err.strip():
        print("ERR:", err)

tenant_id = '1ca30f62-4487-4103-b529-c6d7b041b245'

run_query(f"SELECT COUNT(*), tenant_id FROM dash_devolucoes GROUP BY tenant_id;", "Devolucoes count by tenant")
run_query(f"SELECT COUNT(*), tenant_id FROM dash_vendas GROUP BY tenant_id;", "Vendas count by tenant")
run_query(f"SELECT * FROM dash_devolucoes WHERE tenant_id = '{tenant_id}' LIMIT 5;", "Devolucoes Sample")
run_query(f"SELECT * FROM dash_vendas WHERE tenant_id = '{tenant_id}' LIMIT 5;", "Vendas Sample")
client.close()

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

run_query("SELECT COUNT(*) FROM dash_vendas WHERE tenant_id = '1e40d65f-4319-4c68-ae13-66223820c095';", "Sales Count for Tenant 1e40d65f")
run_query("SELECT COUNT(*) FROM dash_clientes WHERE tenant_id = '1e40d65f-4319-4c68-ae13-66223820c095';", "Clients Count for Tenant 1e40d65f")
run_query("SELECT * FROM dash_usuarios WHERE tenant_id = '1e40d65f-4319-4c68-ae13-66223820c095';", "Users for Tenant 1e40d65f")
client.close()

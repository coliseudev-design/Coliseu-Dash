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

run_query("SELECT DISTINCT tenant_id FROM dash_clientes WHERE nome ILIKE '%vetseed%';", "Tenants in dash_clientes with name Vetseed")
run_query("SELECT DISTINCT tenant_id FROM dash_vendas WHERE status ILIKE '%vetseed%' OR numero_pedido ILIKE '%vetseed%';", "Tenants in dash_vendas with Vetseed")
run_query("SELECT DISTINCT tenant_id FROM dash_vendas_itens WHERE produto ILIKE '%vetseed%' OR marca ILIKE '%vetseed%' OR categoria ILIKE '%vetseed%';", "Tenants in dash_vendas_itens with Vetseed")

client.close()

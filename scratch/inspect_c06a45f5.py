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

tables = [
    'dash_clientes', 'dash_produtos', 'dash_vendedores', 'dash_vendas', 
    'dash_vendas_itens', 'dash_financeiro', 'dash_caixas', 'dash_filiais'
]

for t in tables:
    run_query(f"SELECT COUNT(*) FROM {t} WHERE tenant_id = 'c06a45f5-fd16-4f8c-92b6-af73c00ca278';", f"Count for {t}")

client.close()

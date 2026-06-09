import paramiko

def run_query(sql):
    host = '177.39.17.7'
    user = 'root'
    password = '6EFBC!c0:wzr%Ij'
    container = 'coliseu-db-thyqkc5gkvp7i1nld555wakz-172547374937'
    
    cmd = f'docker exec {container} psql -U coliseu_admin -d coliseu_dashboard -c "{sql}"'
    
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        client.connect(host, username=user, password=password)
        stdin, stdout, stderr = client.exec_command(cmd)
        out = stdout.read().decode('utf-8')
        print(f"--- QUERY: {sql[:100]} ---")
        print(out)
    except Exception as e:
        print(f"Error: {e}")
    finally:
        client.close()

tables = [
    'dash_clientes', 'dash_produtos', 'dash_vendedores', 'dash_vendas', 
    'dash_vendas_itens', 'dash_caixas', 'dash_financeiro', 'dash_devolucoes',
    'dash_usuarios'
]

for t in tables:
    run_query(f"SELECT '{t}' as table, tenant_id, COUNT(*) FROM {t} GROUP BY tenant_id ORDER BY count DESC;")

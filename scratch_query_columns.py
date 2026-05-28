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

# Inspect columns of dash_vendas
run_query("""
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'dash_vendas'
    ORDER BY column_name;
""")

# Inspect columns of dash_vendas_itens
run_query("""
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'dash_vendas_itens'
    ORDER BY column_name;
""")

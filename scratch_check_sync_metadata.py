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
        print(f"--- QUERY: {sql} ---")
        print(out)
    except Exception as e:
        print(f"Error: {e}")
    finally:
        client.close()

run_query("SELECT tenant_id, tabela, ultima_sincronizacao, registros_sincronizados, status, erro_mensagem FROM dash_sync_metadata ORDER BY ultima_sincronizacao DESC LIMIT 30;")

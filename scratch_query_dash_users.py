import paramiko

def run_query(db_name, sql):
    host = '177.39.17.7'
    user = 'root'
    password = '6EFBC!c0:wzr%Ij'
    container = 'coliseu-db-thyqkc5gkvp7i1nld555wakz-172547374937'
    
    cmd = f'docker exec {container} psql -U coliseu_admin -d {db_name} -c "{sql}"'
    
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        client.connect(host, username=user, password=password)
        stdin, stdout, stderr = client.exec_command(cmd)
        out = stdout.read().decode('utf-8')
        print(f"=== DB: {db_name} | QUERY: {sql} ===")
        print(out)
    except Exception as e:
        print(f"Error: {e}")
    finally:
        client.close()

run_query("coliseu_dashboard", "SELECT id, tenant_id, email, nome, ativo FROM dash_usuarios;")
run_query("coliseu_identity", 'SELECT "Id", "Name", "ContactEmail" FROM companies;')

import paramiko

def run_query(sql):
    host = '177.39.17.7'
    user = 'root'
    password = '6EFBC!c0:wzr%Ij'
    container = 'coliseu-db-thyqkc5gkvp7i1nld555wakz-172547374937'
    
    sql_escaped = sql.replace('"', '\\"')
    cmd = f'docker exec {container} psql -U coliseu_admin -d coliseu_identity -c "{sql_escaped}"'
    
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

run_query('SELECT "Id", "Name" FROM companies WHERE "Id" = \'1e40d65f-4319-4c68-ae13-66223820c095\';')
run_query('SELECT "Id", "Name" FROM companies WHERE "Name" LIKE \'%Piveta%\';')

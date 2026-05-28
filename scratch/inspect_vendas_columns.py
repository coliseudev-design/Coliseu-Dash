import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('177.39.17.7', username='root', password='6EFBC!c0:wzr%Ij')

DB_CONTAINER = "coliseu-db-thyqkc5gkvp7i1nld555wakz-172547374937"

def run_psql_file(db, sql):
    sftp = client.open_sftp()
    with sftp.open('/tmp/tmp_query.sql', 'w') as f:
        f.write(sql)
    sftp.close()
    
    cmd = (
        f"docker cp /tmp/tmp_query.sql {DB_CONTAINER}:/tmp/tmp_query.sql && "
        f"docker exec {DB_CONTAINER} psql -U coliseu_admin -d {db} -f /tmp/tmp_query.sql && "
        f"docker exec {DB_CONTAINER} rm /tmp/tmp_query.sql && "
        f"rm /tmp/tmp_query.sql"
    )
    stdin, stdout, stderr = client.exec_command(cmd)
    out = stdout.read().decode('utf-8')
    err = stderr.read().decode('utf-8')
    if err:
        return f"OUT:\n{out}\nERR:\n{err}"
    return out

print("=== Columns of dash_vendas_itens ===")
print(run_psql_file("coliseu_dashboard", "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'dash_vendas_itens';"))

client.close()

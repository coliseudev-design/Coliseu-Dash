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

run_query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'dash_vendas' ORDER BY ordinal_position;", "dash_vendas columns")
run_query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'dash_devolucoes' ORDER BY ordinal_position;", "dash_devolucoes columns")
client.close()

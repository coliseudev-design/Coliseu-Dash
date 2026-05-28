import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('177.39.17.7', username='root', password='6EFBC!c0:wzr%Ij')

DB_CONTAINER = "coliseu-db-thyqkc5gkvp7i1nld555wakz-172547374937"

def run_query(sql, db="coliseu_identity"):
    cmd = f'docker exec {DB_CONTAINER} psql -U coliseu_admin -d {db} -c "{sql}"'
    stdin, stdout, stderr = client.exec_command(cmd)
    print(stdout.read().decode('utf-8'))

run_query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';")
client.close()

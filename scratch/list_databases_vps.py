import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('177.39.17.7', username='root', password='6EFBC!c0:wzr%Ij')

DB_CONTAINER = "coliseu-db-thyqkc5gkvp7i1nld555wakz-172547374937"

def run_cmd(cmd):
    stdin, stdout, stderr = client.exec_command(cmd)
    print(f"=== CMD: {cmd} ===")
    out = stdout.read().decode('utf-8')
    err = stderr.read().decode('utf-8')
    if out.strip():
        print("STDOUT:")
        print(out)
    if err.strip():
        print("STDERR:")
        print(err)

run_cmd(f'docker exec {DB_CONTAINER} psql -U coliseu_admin -d coliseu_identity -c "\\dt"')
client.close()

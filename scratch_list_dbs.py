import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('2.24.82.19', username='root', password='Col@13894645', timeout=10)

def run_cmd(cmd):
    stdin, stdout, stderr = client.exec_command(cmd)
    print(f"=== {cmd} ===")
    print(stdout.read().decode('utf-8'))
    err = stderr.read().decode('utf-8')
    if err:
        print(f"ERR: {err}")

# List tables in coliseu_identity
run_cmd("docker exec 10623a640fab psql -U coliseu_admin -d coliseu_identity -c '\\dt'")

# List tables in coliseu_dashboard
run_cmd("docker exec 10623a640fab psql -U coliseu_admin -d coliseu_dashboard -c '\\dt'")

client.close()

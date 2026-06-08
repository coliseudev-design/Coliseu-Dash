import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('2.24.82.19', username='root', password='Col@13894645', timeout=10)

def run_cmd(cmd):
    stdin, stdout, stderr = client.exec_command(cmd)
    out = stdout.read().decode('utf-8')
    err = stderr.read().decode('utf-8')
    print(f"=== {cmd} ===")
    if out:
        print(out)
    if err:
        print("ERR:", err)

# Query company details
run_cmd("docker exec vasjsucz4yxcb7m4rtqindd2 psql -U coliseu_admin -d coliseu_identity -c \"SELECT \\\"Id\\\", \\\"Name\\\", \\\"FirebirdHost\\\", \\\"FirebirdDatabasePath\\\", \\\"Status\\\" FROM companies WHERE \\\"Id\\\" = '1e40d65f-4319-4c68-ae13-66223820c095'\"")

client.close()

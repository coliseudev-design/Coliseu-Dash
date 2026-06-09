import paramiko
import json

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

# Inspect dashboard-middleware
run_cmd("docker inspect dashboard-middleware-g115wwb76cltjli9wew0cgfi-125244749473 | python3 -c \"import json,sys; d=json.load(sys.stdin); [(print(e)) for e in d[0]['Config']['Env']]\"")

# List databases in the postgres container
run_cmd("docker exec vasjsucz4yxcb7m4rtqindd2 psql -U coliseu_admin -d postgres -c \"SELECT datname FROM pg_database WHERE datistemplate = false;\"")

client.close()

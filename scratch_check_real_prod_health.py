import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('2.24.82.19', username='root', password='Col@13894645', timeout=10)

def run_cmd(cmd):
    stdin, stdout, stderr = client.exec_command(cmd)
    print(f"=== {cmd} ===")
    print(stdout.read().decode('utf-8'))

run_cmd("docker inspect --format '{{json .State.Health}}' 8246f7ff22f2")
run_cmd("docker logs --tail 100 8246f7ff22f2")
client.close()

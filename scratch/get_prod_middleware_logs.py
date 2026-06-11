import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('2.24.82.19', username='root', password='Col@13894645', timeout=10)

def run_cmd(cmd):
    stdin, stdout, stderr = client.exec_command(cmd)
    return stdout.read().decode('utf-8').strip(), stderr.read().decode('utf-8').strip()

print("=== RETRIEVING PROD MIDDLEWARE LOGS ===")
stdout, stderr = run_cmd("docker logs --tail 200 dashboard-middleware-g115wwb76cltjli9wew0cgfi-125118218456")
print("=== STDOUT ===")
print(stdout)
print("=== STDERR ===")
print(stderr)

client.close()

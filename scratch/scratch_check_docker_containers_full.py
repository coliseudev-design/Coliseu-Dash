import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('2.24.82.19', username='root', password='Col@13894645')

def run_cmd(cmd):
    stdin, stdout, stderr = client.exec_command(cmd)
    return stdout.read().decode('utf-8') + stderr.read().decode('utf-8')

mw_container = 'nexus-middleware-br0y0d05a1fq8fpwppb3y5bb-195457690815'

print("=== LATEST 100 LOGS FOR MIDDLEWARE ===")
print(run_cmd(f"docker logs --tail 100 {mw_container}"))

client.close()

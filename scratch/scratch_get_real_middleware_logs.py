import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('2.24.82.19', username='root', password='Col@13894645')

def run_cmd(cmd):
    stdin, stdout, stderr = client.exec_command(cmd)
    return stdout.read().decode('utf-8') + stderr.read().decode('utf-8')

real_mw = 'dashboard-middleware-g115wwb76cltjli9wew0cgfi-012445430561'

print("=== LATEST 150 LOGS FOR REAL MIDDLEWARE ===")
print(run_cmd(f"docker logs --tail 150 {real_mw}"))

client.close()

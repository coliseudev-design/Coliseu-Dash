import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('2.24.82.19', username='root', password='Col@13894645', timeout=10)

def run_cmd(cmd):
    stdin, stdout, stderr = client.exec_command(cmd)
    return stdout.read().decode('utf-8').strip()

print("=== ALL CONTAINERS ON 2.24.82.19 ===")
print(run_cmd("docker ps -a --format '{{.Names}}\t{{.Image}}\t{{.Status}}'"))

print("\n=== LISTEN PORTS ===")
print(run_cmd("ss -tulpn | grep -E '80|443|3200'"))

client.close()

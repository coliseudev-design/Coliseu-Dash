import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('2.24.82.19', username='root', password='Col@13894645')

def run_cmd(cmd):
    stdin, stdout, stderr = client.exec_command(cmd)
    return stdout.read().decode('utf-8') + stderr.read().decode('utf-8')

print("=== ALL CONTAINERS WITH DETAILS ===")
print(run_cmd("docker ps -a --format 'table {{.Names}}\t{{.Status}}\t{{.State}}'"))

client.close()

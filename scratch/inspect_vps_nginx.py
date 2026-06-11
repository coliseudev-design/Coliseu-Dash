import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('177.39.17.7', username='root', password='6EFBC!c0:wzr%Ij')

def run_cmd(cmd):
    stdin, stdout, stderr = client.exec_command(cmd)
    return stdout.read().decode('utf-8').strip()

print("=== PS AUX NGINX ===")
print(run_cmd("ps aux | grep nginx"))

print("\n=== SS TULPN ===")
print(run_cmd("ss -tulpn"))

print("\n=== DOCKER PS FOR PORT 80/443 ===")
print(run_cmd("docker ps --format '{{.Names}}\t{{.Ports}}'"))

client.close()

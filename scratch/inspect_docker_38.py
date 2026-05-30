import paramiko

HOST = '38.242.244.84'
USER = 'root'
PASS = '6EFBC!c0:wzr%Ij'

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
try:
    client.connect(HOST, username=USER, password=PASS, timeout=10)
    print("SSH connection succeeded!")
    stdin, stdout, stderr = client.exec_command("docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'")
    print("=== DOCKER CONTAINERS ===")
    print(stdout.read().decode('utf-8'))
    print("=== STDERR ===")
    print(stderr.read().decode('utf-8'))
except Exception as e:
    print("Error:", e)
finally:
    client.close()

import paramiko

HOST = '2.24.82.19'
USER = 'root'
PASS = 'ColiseuDB2026Prod'

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
try:
    client.connect(HOST, username=USER, password=PASS, timeout=10)
    print("SSH connection succeeded!")
    stdin, stdout, stderr = client.exec_command("docker ps")
    print("=== DOCKER PS ON MIDDLEWARE VPS ===")
    print(stdout.read().decode('utf-8'))
except Exception as e:
    print("Error:", e)
finally:
    client.close()

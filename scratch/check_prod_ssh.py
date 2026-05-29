import paramiko

HOST = '2.24.82.19'
USER = 'root'
PASS = '6EFBC!c0:wzr%Ij'

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
try:
    client.connect(HOST, username=USER, password=PASS, timeout=10)
    print("SSH connection to production 2.24.82.19 succeeded!")
    # Let's find running docker containers
    _, stdout, _ = client.exec_command("docker ps --format '{{.Names}}'")
    print("Containers on Prod:")
    print(stdout.read().decode('utf-8'))
except Exception as e:
    print("SSH connection to prod failed:", e)
finally:
    client.close()

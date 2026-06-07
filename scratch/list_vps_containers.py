import paramiko

HOST = '177.39.17.7'
USER = 'root'
PASS = '6EFBC!c0:wzr%Ij'

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
try:
    client.connect(HOST, username=USER, password=PASS)
    print("=== docker ps -a ===")
    stdin, stdout, stderr = client.exec_command("docker ps -a")
    print(stdout.read().decode('utf-8'))
except Exception as e:
    print("Error:", e)
finally:
    client.close()

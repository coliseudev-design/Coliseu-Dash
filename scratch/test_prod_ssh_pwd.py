import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
try:
    print("Trying password '0r0E6oV!qG3h' on 2.24.82.19...")
    client.connect('2.24.82.19', username='root', password='0r0E6oV!qG3h', timeout=5)
    print("SUCCESS!")
    stdin, stdout, stderr = client.exec_command("docker ps --format '{{.Names}}'")
    print(stdout.read().decode('utf-8'))
except Exception as e:
    print("Failed:", e)
finally:
    client.close()

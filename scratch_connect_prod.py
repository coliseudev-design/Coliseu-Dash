import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
try:
    print("Connecting to 2.24.82.19...")
    client.connect('2.24.82.19', username='root', password='6EFBC!c0:wzr%Ij')
    print("Success!")
    stdin, stdout, stderr = client.exec_command("docker ps -a --format '{{.Names}}'")
    print("=== Production Containers ===")
    print(stdout.read().decode('utf-8'))
except Exception as e:
    print(f"Error: {e}")
finally:
    client.close()

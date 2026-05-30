import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('177.39.17.7', username='root', password='6EFBC!c0:wzr%Ij')

CONTAINER = "dashboard-middleware-irerzifjwjb4q8ucbpfk2gb8-194727891772"

stdin, stdout, stderr = client.exec_command(f"docker logs --tail 100 {CONTAINER}")
print("=== Logs Middleware ===")
print(stdout.read().decode('utf-8'))
err = stderr.read().decode('utf-8')
if err.strip():
    print("ERR:", err)

client.close()

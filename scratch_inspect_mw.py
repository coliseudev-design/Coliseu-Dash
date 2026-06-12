import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('177.39.17.7', username='root', password='6EFBC!c0:wzr%Ij')

# Inspect environment variables for dashboard-middleware dynamically
cmd = "docker inspect $(docker ps --format '{{.Names}}' | grep dashboard-middleware | head -n 1) --format '{{range .Config.Env}}{{.}}\n{{end}}'"
stdin, stdout, stderr = client.exec_command(cmd)
print("=== Env variables for dashboard-middleware ===")
print(stdout.read().decode('utf-8'))
err = stderr.read().decode('utf-8')
if err:
    print("ERR:", err)

client.close()

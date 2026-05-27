import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('177.39.17.7', username='root', password='6EFBC!c0:wzr%Ij')

cmd = "docker inspect --format='{{range .Config.Env}}{{println .}}{{end}}' dashboard-middleware-irerzifjwjb4q8ucbpfk2gb8-202239298184"
stdin, stdout, stderr = client.exec_command(cmd)
print("=== Database Env Values ===")
for line in stdout.read().decode('utf-8').splitlines():
    if '=' in line:
        k, v = line.split('=', 1)
        if any(x in k for x in ['PG_HOST', 'PG_PORT', 'PG_DATABASE', 'PG_USER']):
            print(f"  {k} = {v}")

client.close()

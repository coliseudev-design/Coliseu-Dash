import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('177.39.17.7', username='root', password='6EFBC!c0:wzr%Ij')

def inspect_env(container_name):
    cmd = f"docker inspect --format='{{{{range .Config.Env}}}}{{{{.}}}}\\n{{{{end}}}}' {container_name}"
    stdin, stdout, stderr = client.exec_command(cmd)
    print(f"=== Env for {container_name} ===")
    lines = stdout.read().decode('utf-8').split('\n')
    for line in lines:
        if not line.strip():
            continue
        if '=' in line:
            parts = line.split('=', 1)
            name = parts[0]
            val = parts[1]
            if any(k in name.upper() for k in ['PASS', 'KEY', 'SECRET', 'TOKEN', 'AUTH']):
                print(f"{name}=******")
            else:
                print(f"{name}={val}")
        else:
            print(line)

# Find MW container name
stdin, stdout, stderr = client.exec_command("docker ps --format '{{.Names}}' | grep 'dashboard-middleware'")
mw = stdout.read().decode('utf-8').strip()
print(f"Active middleware container: {mw}")

inspect_env(mw)
client.close()

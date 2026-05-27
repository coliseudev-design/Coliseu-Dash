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
        if any(k in line for k in ['PG', 'DB', 'PORT', 'URL', 'KEY', 'HOST', 'USER', 'PASSWORD']):
            # Redact password for safety
            if 'PASS' in line:
                parts = line.split('=')
                print(f"{parts[0]}=******")
            else:
                print(line)

inspect_env("dashboard-middleware-irerzifjwjb4q8ucbpfk2gb8-202239298184")
print("\n")
inspect_env("api-nsnopymisrq9qphl5qjc3w5l-042333644905")

client.close()

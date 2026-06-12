import paramiko

HOST = '177.39.17.7'
USER = 'root'
PASS = '6EFBC!c0:wzr%Ij'

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PASS)

def exec_env(container_name):
    cmd = f"docker exec {container_name} env"
    stdin, stdout, stderr = client.exec_command(cmd)
    print(f"\n=== env for {container_name} ===")
    out = stdout.read().decode('utf-8')
    err = stderr.read().decode('utf-8')
    if err.strip():
        print("ERR:", err)
    lines = out.split('\n')
    for line in lines:
        if line.strip():
            # Redact passwords/keys for safety
            if any(k in line for k in ['PASS', 'KEY', 'JWT', 'SECRET', 'TOKEN']):
                parts = line.split('=')
                print(f"{parts[0]}=******")
            else:
                print(line)

exec_env("dashboard-middleware-irerzifjwjb4q8ucbpfk2gb8-230500884654")
exec_env("api-nsnopymisrq9qphl5qjc3w5l-130259252935")

client.close()

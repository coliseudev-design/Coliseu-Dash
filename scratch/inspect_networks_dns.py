import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
try:
    client.connect('2.24.82.19', username='root', password='Col@13894645', timeout=10)
    print("Connected to VPS")
except Exception as e:
    print("Failed to connect:", e)
    exit(1)

def run_cmd(cmd):
    print(f"\n--- Running: {cmd} ---")
    stdin, stdout, stderr = client.exec_command(cmd)
    out = stdout.read().decode('utf-8')
    err = stderr.read().decode('utf-8')
    if out:
        print("STDOUT:")
        print(out)
    if err:
        print("STDERR:")
        print(err)
    return out

frontend = "dashboard-frontend-g115wwb76cltjli9wew0cgfi-131915489999"
middleware = "dashboard-middleware-g115wwb76cltjli9wew0cgfi-131915494166"

print("\n=== Frontend Network Settings ===")
run_cmd(f"docker inspect {frontend} --format '{{{{json .NetworkSettings.Networks}}}}'")

print("\n=== Middleware Network Settings ===")
run_cmd(f"docker inspect {middleware} --format '{{{{json .NetworkSettings.Networks}}}}'")

# Try pinging from frontend to dashboard-middleware
run_cmd(f"docker exec {frontend} ping -c 2 dashboard-middleware || true")

# Try pinging from frontend to dashboard-middleware container name
run_cmd(f"docker exec {frontend} ping -c 2 {middleware} || true")

# Try curl/wget from frontend to dashboard-middleware
run_cmd(f"docker exec {frontend} wget -qO- http://dashboard-middleware:3200/health/liveness || true")
run_cmd(f"docker exec {frontend} wget -qO- http://{middleware}:3200/health/liveness || true")

client.close()

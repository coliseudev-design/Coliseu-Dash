import paramiko

HOST = '177.39.17.7'
USER = 'root'
PASS = '6EFBC!c0:wzr%Ij'
CONTAINER = 'dashboard-middleware-irerzifjwjb4q8ucbpfk2gb8-010649342983'

def run_cmd(cmd, label):
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        client.connect(HOST, username=USER, password=PASS)
        _, stdout, stderr = client.exec_command(cmd)
        print(f"\n=== {label} ===")
        print(stdout.read().decode('utf-8'))
        err = stderr.read().decode('utf-8').strip()
        if err:
            print("ERR:", err)
    except Exception as e:
        print(f"[ERROR]: {e}")
    finally:
        client.close()

# Let's inspect src/routes/bi.js inside the container
run_cmd(
    f"docker exec {CONTAINER} grep -n -C 3 'max_date' src/routes/bi.js",
    "Grep max_date in bi.js inside container"
)

# Let's check when bi.js was modified in the container
run_cmd(
    f"docker exec {CONTAINER} ls -la src/routes/bi.js",
    "ls -la of bi.js inside container"
)

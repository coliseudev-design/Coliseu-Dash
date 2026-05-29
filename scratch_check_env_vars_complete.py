import paramiko

HOST = '177.39.17.7'
USER = 'root'
PASS = '6EFBC!c0:wzr%Ij'
CONTAINER = 'dashboard-middleware-irerzifjwjb4q8ucbpfk2gb8-005649123523'

def run_cmd(label, cmd):
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        client.connect(HOST, username=USER, password=PASS)
        _, stdout, stderr = client.exec_command(cmd)
        out = stdout.read().decode('utf-8')
        err = stderr.read().decode('utf-8')
        print(f"\n=== {label} ===")
        print(out or "(sem resultado)")
        if err.strip():
            print("ERR:", err)
    except Exception as e:
        print(f"[ERRO] {label}: {e}")
    finally:
        client.close()

run_cmd(
    "ALL ENVIRONMENT VARIABLES FOR MIDDLEWARE",
    f"docker inspect {CONTAINER} | grep -A 30 -i '\"Env\"'"
)

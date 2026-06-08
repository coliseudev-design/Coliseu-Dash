import paramiko
import json

HOST = '177.39.17.7'
USER = 'root'
PASS = '6EFBC!c0:wzr%Ij'
CONTAINER = 'dashboard-frontend-irerzifjwjb4q8ucbpfk2gb8-010649336876'

def run_cmd(cmd):
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        client.connect(HOST, username=USER, password=PASS)
        _, stdout, stderr = client.exec_command(cmd)
        out = stdout.read().decode('utf-8')
        err = stderr.read().decode('utf-8')
        return out, err
    except Exception as e:
        return None, str(e)
    finally:
        client.close()

out, err = run_cmd(f"docker inspect {CONTAINER}")
if out:
    try:
        data = json.loads(out)
        env = data[0]['Config']['Env']
        print("=== Frontend Container Env Vars ===")
        for item in env:
            print(item)
    except Exception as e:
        print("JSON parse error:", e)
else:
    print("Error getting container info:", err)

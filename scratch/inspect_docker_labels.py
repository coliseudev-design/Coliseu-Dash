import paramiko
import json

HOST = '177.39.17.7'
USER = 'root'
PASS = '6EFBC!c0:wzr%Ij'

def run_cmd(cmd):
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        client.connect(HOST, username=USER, password=PASS)
        _, stdout, stderr = client.exec_command(cmd)
        out = stdout.read().decode('utf-8')
        return out
    except Exception as e:
        return str(e)
    finally:
        client.close()

# List labels for specific containers
cmd = "docker inspect dashboard-middleware-irerzifjwjb4q8ucbpfk2gb8-010649342983 dashboard-frontend-irerzifjwjb4q8ucbpfk2gb8-010649336876 --format '{{.Name}}: {{.Config.Labels}}'"
print(run_cmd(cmd))

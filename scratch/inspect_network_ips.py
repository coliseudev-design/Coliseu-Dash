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
        return stdout.read().decode('utf-8')
    except Exception as e:
        return str(e)
    finally:
        client.close()

print(run_cmd("docker network inspect coolify --format '{{json .Containers}}'"))

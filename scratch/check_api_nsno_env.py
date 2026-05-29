import paramiko
import json

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('177.39.17.7', username='root', password='6EFBC!c0:wzr%Ij')

CONTAINER = "api-nsnopymisrq9qphl5qjc3w5l-123757509887"

try:
    stdin, stdout, stderr = client.exec_command(f"docker inspect {CONTAINER}")
    info = json.loads(stdout.read().decode('utf-8'))
    env_vars = info[0]['Config']['Env']
    print("=== OTHER CONTAINER ENV ===")
    for var in env_vars:
        if any(term in var for term in ["PG_", "DATABASE", "VET", "DB"]):
            print(var)
except Exception as e:
    print(f"Error: {e}")

client.close()

import paramiko
import json

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('177.39.17.7', username='root', password='6EFBC!c0:wzr%Ij')

container = "api-nsnopymisrq9qphl5qjc3w5l-130259252935"

print("=== IDENTITY API CONTAINER ENV VARS ===")
stdin, stdout, stderr = client.exec_command(f"docker inspect {container}")
inspect_out = stdout.read().decode('utf-8')

try:
    data = json.loads(inspect_out)
    if data:
        c = data[0]
        for env in c.get("Config", {}).get("Env", []):
            print("  ", env)
except Exception as e:
    print("Error parsing inspect:", e)

client.close()

import paramiko
import json

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('2.24.82.19', username='root', password='Col@13894645', timeout=10)

def print_raw_env(container_name):
    cmd = f"docker inspect {container_name}"
    stdin, stdout, stderr = client.exec_command(cmd)
    out = stdout.read().decode('utf-8')
    try:
        data = json.loads(out)
        env = data[0]['Config']['Env']
        print(f"=== Env for {container_name} ===")
        for e in env:
            if any(k in e for k in ['InternalApiKey', 'SalesApi__InternalAdminKey', 'IDENTITY_INTERNAL_KEY', 'INTERNAL_API_KEY', 'JWT_DEVICE_KEY']):
                print(e)
    except Exception as ex:
        print("Error:", ex)

print_raw_env("dashboard-middleware-g115wwb76cltjli9wew0cgfi-125244749473")
print_raw_env("identity-oqyafcbt0l2r7fit91zbev6h-134026443681")

client.close()

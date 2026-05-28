import paramiko
import json
import urllib.request
import ssl

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('177.39.17.7', username='root', password='6EFBC!c0:wzr%Ij')

# Read env file on VPS
stdin, stdout, stderr = client.exec_command("cat /data/coolify/applications/irerzifjwjb4q8ucbpfk2gb8/.env")
env_data = {}
for line in stdout.read().decode('utf-8').split('\n'):
    if '=' in line:
        k, v = line.split('=', 1)
        env_data[k.strip()] = v.strip()
client.close()

api_key = env_data.get('INTERNAL_API_KEY')
jwt_key = env_data.get('JWT_DEVICE_KEY')

print("Retrieved keys from VPS .env")
print("INTERNAL_API_KEY starts with:", api_key[:8] if api_key else "None")

BASE = "https://dashboard.coliseusistemas.com.br"
# Test with tenant 3edd56b4-e002-48ed-8ecb-131c0c62dcfb
TENANT = "3edd56b4-e002-48ed-8ecb-131c0c62dcfb"

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

def call_api(method, path, headers=None):
    h = {
        "X-Tenant-Id": TENANT,
        "X-Internal-Key": api_key, # Try X-Internal-Key as required in requireInternalAuth
        "Content-Type": "application/json"
    }
    if headers:
        h.update(headers)
    req = urllib.request.Request(BASE + path, headers=h, method=method)
    try:
        with urllib.request.urlopen(req, context=ctx, timeout=10) as r:
            return r.status, json.loads(r.read().decode())
    except Exception as e:
        if hasattr(e, 'read'):
            return getattr(e, 'code', None), e.read().decode()
        return None, str(e)

# 1. Test /internal/sync/status
status, data = call_api("GET", "/internal/sync/status")
print(f"=== /internal/sync/status (HTTP {status}) ===")
print(json.dumps(data, indent=2))

# Let's try key header as X-Internal-Api-Key too
def call_api_alt(method, path):
    h = {
        "X-Tenant-Id": TENANT,
        "X-Internal-Api-Key": api_key,
        "Content-Type": "application/json"
    }
    req = urllib.request.Request(BASE + path, headers=h, method=method)
    try:
        with urllib.request.urlopen(req, context=ctx, timeout=10) as r:
            return r.status, json.loads(r.read().decode())
    except Exception as e:
        if hasattr(e, 'read'):
            return getattr(e, 'code', None), e.read().decode()
        return None, str(e)

status_alt, data_alt = call_api_alt("GET", "/internal/sync/status")
print(f"=== /internal/sync/status ALT (HTTP {status_alt}) ===")
print(json.dumps(data_alt, indent=2))

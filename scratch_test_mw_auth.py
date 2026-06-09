import urllib.request, urllib.error, json, ssl

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

BASE = "https://dashboard.coliseusistemas.com.br"
TENANT = "ed1d3a98-4c4d-48db-99c0-8751926eb8e5" # Piveta Dist

def test_key(key):
    headers = {
        "X-Tenant-Id": TENANT,
        "X-Internal-Key": key,
        "Content-Type": "application/json"
    }
    # Call status endpoint (GET /internal/sync/status) which is protected by requireInternalAuth
    req = urllib.request.Request(f"{BASE}/internal/sync/status", headers=headers, method="GET")
    try:
        with urllib.request.urlopen(req, context=ctx, timeout=8) as r:
            body = r.read().decode('utf-8')
            return r.status, body[:200]
    except urllib.error.HTTPError as e:
        body = e.read().decode('utf-8')
        return e.code, body[:200]
    except Exception as e:
        return None, str(e)

keys_to_test = [
    "COL-BKEQ-6TAK-F55R", # Bypass 1
    "COL-YUZA-9WSK-TN88", # Bypass 2
    "COL-KGV7-UFY2-XEBX", # Piveta's key
    "COL-INVALID-KEY"     # Invalid key
]

for k in keys_to_test:
    status, body = test_key(k)
    print(f"Key: {k} -> HTTP {status} | Response: {body}")

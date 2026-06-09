import urllib.request, urllib.error, json, ssl

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

BASE = "https://adminlicencas.coliseusistemas.com.br"
INTERNAL_KEY = "Coliseu2026!IdentitySuperSecretKeyOauth20"

def call_identity(tenant, key):
    headers = {
        "X-Internal-Api-Key": INTERNAL_KEY,
        "Content-Type": "application/json"
    }
    data = {"apiKey": key}
    body = json.dumps(data).encode('utf-8')
    url = f"{BASE}/internal/companies/{tenant}/modules/coliseu-dash/validate-key"
    req = urllib.request.Request(url, headers=headers, data=body, method="POST")
    try:
        with urllib.request.urlopen(req, context=ctx, timeout=8) as r:
            res_body = r.read().decode('utf-8')
            return r.status, res_body
    except urllib.error.HTTPError as e:
        res_body = e.read().decode('utf-8')
        return e.code, res_body
    except Exception as e:
        return None, str(e)

tests = [
    # (Tenant ID, Company Name, Key to test)
    ("ed1d3a98-4c4d-48db-99c0-8751926eb8e5", "Piveta Dist", "COL-J5C8-7YPW-E7UZ"),
    ("ed1d3a98-4c4d-48db-99c0-8751926eb8e5", "Piveta Dist", "COL-BKEQ-6TAK-F55R"),
    ("816f97c4-66fb-4ef8-905d-e0551cbf2492", "Petclub", "COL-BKEQ-6TAK-F55R"),
    ("816f97c4-66fb-4ef8-905d-e0551cbf2492", "Petclub", "COL-YUZA-9WSK-TN88"),
    ("a822a7e7-fdd4-4483-bbb5-26587a72739f", "KS Tratores", "COL-BKEQ-6TAK-F55R")
]

for tenant, name, key in tests:
    status, body = call_identity(tenant, key)
    print(f"Company: {name} | Tenant: {tenant} | Key: {key} -> HTTP {status} | Response: {body}")

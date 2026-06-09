import urllib.request, urllib.error, json, ssl

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

BASE = "https://adminlicencas.coliseusistemas.com.br"
TENANT = "ed1d3a98-4c4d-48db-99c0-8751926eb8e5" # Piveta Dist
API_KEY = "COL-J5C8-7YPW-E7UZ" # Correct decrypted key!

def call_identity(internal_api_key):
    headers = {
        "X-Internal-Api-Key": internal_api_key,
        "Content-Type": "application/json"
    }
    data = {"apiKey": API_KEY}
    body = json.dumps(data).encode('utf-8')
    url = f"{BASE}/internal/companies/{TENANT}/modules/coliseu-dash/validate-key"
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

keys_to_test = [
    "aQbY3eqVz2xd8PSr0AUKtfwFRo7n1IickE6sMGWTNCpXhZ95", # Incorrect key
    "Coliseu2026!IdentitySuperSecretKeyOauth20"        # Correct key
]

for k in keys_to_test:
    status, body = call_identity(k)
    print(f"Internal Key: {k[:8]}... -> HTTP {status} | Response: {body}")

import urllib.request
import urllib.parse
import urllib.error
import json
import ssl

BASE = "http://2.24.82.19:8000"
EMAIL = "coliseu.dev@gmail.com"
SENHA = "Col@!13894645"
TENANT = "2395efd5-6476-4f3c-a7b8-f31d5567b42f"

ERP = {
    "2026-06-01": 73131.16,  "2026-06-02": 72027.90,  "2026-06-03": 101117.04,
    "2026-06-04": 321.00,    "2026-06-05": 76965.70,  "2026-06-06": 52996.35,
    "2026-06-08": 49924.37,  "2026-06-09": 74591.49,  "2026-06-10": 102500.01,
    "2026-06-11": 64853.19,  "2026-06-12": 129899.60, "2026-06-13": 896.53,
    "2026-06-15": 64827.29,  "2026-06-16": 108572.58, "2026-06-17": 79868.95,
    "2026-06-18": 71037.29,  "2026-06-19": 68468.84,  "2026-06-20": 35646.73,
    "2026-06-22": 55800.83,  "2026-06-23": 71686.58,  "2026-06-24": 73317.10,
    "2026-06-25": 38370.17,
}

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

def post(path, data, headers={}):
    body = json.dumps(data).encode()
    h = {"Content-Type": "application/json", "Accept": "application/json"}
    h.update(headers)
    req = urllib.request.Request(f"{BASE}{path}", data=body, headers=h, method="POST")
    try:
        with urllib.request.urlopen(req, context=ctx, timeout=15) as r:
            return r.status, json.loads(r.read().decode())
    except urllib.error.HTTPError as e:
        try: body = json.loads(e.read().decode())
        except: body = {}
        return e.code, body
    except Exception as e:
        return 0, {"error": str(e)}

def get(path, headers={}):
    h = {"Accept": "application/json"}
    h.update(headers)
    req = urllib.request.Request(f"{BASE}{path}", headers=h)
    try:
        with urllib.request.urlopen(req, context=ctx, timeout=15) as r:
            return r.status, json.loads(r.read().decode())
    except urllib.error.HTTPError as e:
        try: body = json.loads(e.read().decode())
        except: body = {}
        return e.code, body
    except Exception as e:
        return 0, {"error": str(e)}

# Tentar login no Coolify
print("=== LOGIN COOLIFY ===")
status, resp = post("/api/v1/auth/login", {"email": EMAIL, "password": SENHA})
print(f"Status: {status}")
print(json.dumps(resp, indent=2, ensure_ascii=False)[:500])

token = resp.get("token") or resp.get("access_token") or resp.get("data", {}).get("token", "")
print(f"\nToken: {token[:50] if token else 'NAO ENCONTRADO'}...")

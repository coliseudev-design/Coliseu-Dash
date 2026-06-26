import urllib.request
import urllib.parse
import urllib.error
import http.cookiejar
import json
import re

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

# ---- Login com CSRF ----
cj = http.cookiejar.CookieJar()
opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj))

resp = opener.open(f"{BASE}/login", timeout=10)
html = resp.read().decode('utf-8', errors='replace')
m = re.search(r'<meta name="csrf-token" content="([^"]+)"', html)
if not m:
    m = re.search(r'name="_token".*?value="([^"]+)"', html, re.DOTALL)
csrf = m.group(1) if m else ""
print(f"CSRF: {csrf[:30]}...")

data = urllib.parse.urlencode({"_token": csrf, "email": EMAIL, "password": SENHA}).encode()
req = urllib.request.Request(f"{BASE}/login", data=data, headers={
    "Content-Type": "application/x-www-form-urlencoded",
    "Referer": f"{BASE}/login",
})
opener.open(req, timeout=10)
print("Login OK")

# ---- Tentar gerar API Token Coolify ----
def api_get(path):
    req = urllib.request.Request(f"{BASE}{path}", headers={
        "Accept": "application/json", "X-CSRF-TOKEN": csrf, "Referer": f"{BASE}/"
    })
    try:
        r = opener.open(req, timeout=10)
        return r.status, json.loads(r.read().decode())
    except urllib.error.HTTPError as e:
        try: return e.code, json.loads(e.read().decode())
        except: return e.code, {}

def api_post(path, payload={}):
    body = json.dumps(payload).encode()
    req = urllib.request.Request(f"{BASE}{path}", data=body, headers={
        "Accept": "application/json", "Content-Type": "application/json",
        "X-CSRF-TOKEN": csrf, "Referer": f"{BASE}/",
    }, method="POST")
    try:
        r = opener.open(req, timeout=15)
        return r.status, json.loads(r.read().decode())
    except urllib.error.HTTPError as e:
        try: return e.code, json.loads(e.read().decode())
        except: return e.code, {}

# Gerar API Token
print("\n=== GERAR API TOKEN ===")
s, r = api_post("/api/v1/security/api-tokens", {"description": "audit-brandao"})
print(f"Status: {s} | {json.dumps(r)[:300]}")

api_token = r.get("token", r.get("api_token", ""))
print(f"API Token: {api_token[:50] if api_token else 'NAO GERADO'}")

# Listar servidores
print("\n=== SERVIDORES COOLIFY ===")
s2, r2 = api_get("/api/v1/servers")
print(f"Status: {s2}")
if isinstance(r2, list):
    for srv in r2[:5]:
        print(f"  id:{srv.get('id')} name:{srv.get('name')} ip:{srv.get('ip')}")
elif isinstance(r2, dict):
    print(json.dumps(r2, indent=2)[:500])

# Listar databases
print("\n=== DATABASES COOLIFY ===")
s3, r3 = api_get("/api/v1/databases")
print(f"Status: {s3}")
if isinstance(r3, list):
    for db in r3[:10]:
        print(f"  id:{db.get('id')} name:{db.get('name')} type:{db.get('type')} status:{db.get('status')}")
elif isinstance(r3, dict):
    print(json.dumps(r3, indent=2)[:500])

# Tentar executar comando no banco via Coolify
print("\n=== EXECUTAR QUERY VIA COOLIFY ===")
s4, r4 = api_get("/api/v1/databases?type=postgresql")
print(json.dumps(r4, ensure_ascii=False)[:500])

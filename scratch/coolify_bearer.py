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
API_TOKEN = "NaHA9wrVvI3CAvQSnWJO6S6rj1eos3LPpeyoijyv"

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

def api(path, method="GET", payload=None):
    body = json.dumps(payload).encode() if payload else None
    req = urllib.request.Request(f"{BASE}{path}", data=body, headers={
        "Accept": "application/json",
        "Authorization": f"Bearer {API_TOKEN}",
        "Content-Type": "application/json",
    }, method=method)
    try:
        r = urllib.request.urlopen(req, timeout=15)
        return r.status, json.loads(r.read().decode())
    except urllib.error.HTTPError as e:
        try: return e.code, json.loads(e.read().decode())
        except: return e.code, {}

print("=== TEST API TOKEN ===")
s, r = api("/api/v1/version")
print(f"Status: {s} | {r}")

print("\n=== SERVIDORES ===")
s, r = api("/api/v1/servers")
print(f"Status: {s}")
if isinstance(r, list):
    for srv in r: print(f"  {srv}")
else:
    print(json.dumps(r, ensure_ascii=False)[:400])

print("\n=== DATABASES ===")
s, r = api("/api/v1/databases")
print(f"Status: {s}")
print(json.dumps(r, ensure_ascii=False)[:600])

# Se tiver acesso, listar apps/services
print("\n=== SERVICES ===")
s, r = api("/api/v1/services")
print(f"Status: {s}")
if isinstance(r, list):
    for svc in r[:10]:
        print(f"  id:{svc.get('id')} name:{svc.get('name')} uuid:{svc.get('uuid','')}")
else:
    print(json.dumps(r, ensure_ascii=False)[:400])

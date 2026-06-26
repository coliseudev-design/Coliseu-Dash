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

# Login
cj = http.cookiejar.CookieJar()
opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj))

resp = opener.open(f"{BASE}/login", timeout=10)
html = resp.read().decode('utf-8', errors='replace')
m = re.search(r'<meta name="csrf-token" content="([^"]+)"', html)
csrf = m.group(1) if m else ""
data = urllib.parse.urlencode({"_token": csrf, "email": EMAIL, "password": SENHA}).encode()
req = urllib.request.Request(f"{BASE}/login", data=data, headers={
    "Content-Type": "application/x-www-form-urlencoded", "Referer": f"{BASE}/login",
})
opener.open(req, timeout=10)
print("Login OK")

# Pegar XSRF atualizado após login
resp2 = opener.open(f"{BASE}/sanctum/csrf-cookie", timeout=10)
xsrf = next((c.value for c in cj if c.name == 'XSRF-TOKEN'), '')
xsrf_decoded = urllib.parse.unquote(xsrf)

# Tentar criar API token via Livewire
print("\n=== CRIAR TOKEN VIA LIVEWIRE ===")
livewire_payload = {
    "fingerprint": {
        "id": "audit-token",
        "name": "security.api-tokens",
        "locale": "en",
        "path": "security/api-tokens",
        "method": "GET",
        "v": "acj"
    },
    "serverMemo": {"htmlHash": ""},
    "updates": [{"type": "callMethod", "payload": {"id": "audit", "method": "createToken", "params": ["audit-key"]}}]
}
body2 = json.dumps(livewire_payload).encode()
req2 = urllib.request.Request(f"{BASE}/livewire/message/security.api-tokens", data=body2, headers={
    "Accept": "application/json", "Content-Type": "application/json",
    "X-CSRF-TOKEN": csrf, "X-XSRF-TOKEN": xsrf_decoded,
    "Referer": f"{BASE}/security/api-tokens",
    "X-Livewire": "true",
}, method="POST")
try:
    r2 = opener.open(req2, timeout=15)
    resp_data = json.loads(r2.read().decode())
    print(f"Livewire: {json.dumps(resp_data)[:500]}")
    # Extrair token
    effects = resp_data.get('effects', {})
    for ev in effects.get('dispatches', []):
        if 'token' in str(ev).lower():
            print(f"TOKEN ENCONTRADO: {ev}")
except Exception as e:
    print(f"Livewire error: {e}")

# Abordagem alternativa: consultar diretamente via PostgreSQL connection string
# que o Coolify expõe nas páginas de database
print("\n=== PAGINAS DO COOLIFY (buscar conn string) ===")
pages = ["/databases", "/servers", "/services", "/projects"]
for page in pages:
    try:
        req3 = urllib.request.Request(f"{BASE}{page}", headers={"Referer": f"{BASE}/"})
        r3 = opener.open(req3, timeout=10)
        html3 = r3.read().decode('utf-8', errors='replace')
        # Buscar connection strings PostgreSQL
        pg_conns = re.findall(r'postgresql://[^\s"\'<>]+', html3)
        if pg_conns:
            print(f"\n  [{page}] PostgreSQL URIs encontradas:")
            for conn in pg_conns[:5]:
                print(f"    {conn}")
        # Buscar endereços/IPs
        ips = re.findall(r'\b(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\b', html3)
        unique_ips = set(ips) - {'2.24.82.19', '127.0.0.1', '0.0.0.0'}
        if unique_ips:
            print(f"  [{page}] IPs: {unique_ips}")
    except Exception as e:
        print(f"  [{page}]: {e}")

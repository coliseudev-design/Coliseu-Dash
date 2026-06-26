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

# ---- Login ----
cj = http.cookiejar.CookieJar()
opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj))

resp = opener.open(f"{BASE}/login", timeout=10)
html = resp.read().decode('utf-8', errors='replace')
m = re.search(r'<meta name="csrf-token" content="([^"]+)"', html)
if not m:
    m = re.search(r'name="_token".*?value="([^"]+)"', html, re.DOTALL)
csrf = m.group(1) if m else ""

data = urllib.parse.urlencode({"_token": csrf, "email": EMAIL, "password": SENHA}).encode()
req = urllib.request.Request(f"{BASE}/login", data=data, headers={
    "Content-Type": "application/x-www-form-urlencoded",
    "Referer": f"{BASE}/login",
})
opener.open(req, timeout=10)
print("Login OK")

# Coolify v4 usa Sanctum - precisa do token de outra forma
# Tentar /livewire/message para gerar token (interface Livewire)
# Ou tentar /api/v1/... com o cookie de sessão (Sanctum cookie-based auth)

def get_page(path):
    req = urllib.request.Request(f"{BASE}{path}", headers={"Referer": f"{BASE}/"})
    try:
        r = opener.open(req, timeout=10)
        return r.status, r.read().decode('utf-8', errors='replace')
    except urllib.error.HTTPError as e:
        return e.code, ""

# Tentar acessar /security/api-tokens para ver se aparece o token
print("\n=== PAGINA DE API TOKENS ===")
s, html2 = get_page("/security/api-tokens")
print(f"Status: {s}")
# Procurar tokens existentes
tokens = re.findall(r'[A-Za-z0-9]{40,}', html2)
if tokens:
    print(f"Possíveis tokens encontrados: {tokens[:3]}")

# Tentar Sanctum CSRF + API
print("\n=== SANCTUM CSRF TOKEN ===")
s2, csrf_resp = get_page("/sanctum/csrf-cookie")
print(f"Status sanctum: {s2}")
print(f"Cookies: {[c.name+'='+c.value[:20] for c in cj]}")

# Tentar API com cookie de sessão Sanctum
def api_bearer(path, token):
    req = urllib.request.Request(f"{BASE}{path}", headers={
        "Accept": "application/json",
        "Authorization": f"Bearer {token}",
    })
    try:
        r = opener.open(req, timeout=10)
        return r.status, json.loads(r.read().decode())
    except urllib.error.HTTPError as e:
        try: return e.code, json.loads(e.read().decode())
        except: return e.code, {}

# Tentar acessar API com X-XSRF-TOKEN (Sanctum SPA)
xsrf = next((c.value for c in cj if c.name == 'XSRF-TOKEN'), '')
session = next((c.value for c in cj if 'session' in c.name.lower() or 'laravel' in c.name.lower()), '')
print(f"XSRF-TOKEN: {xsrf[:30]}...")
print(f"Session cookie: {session[:30]}...")

def api_sanctum(path):
    req = urllib.request.Request(f"{BASE}{path}", headers={
        "Accept": "application/json",
        "X-XSRF-TOKEN": urllib.parse.unquote(xsrf),
        "Referer": f"{BASE}/",
    })
    try:
        r = opener.open(req, timeout=10)
        return r.status, json.loads(r.read().decode())
    except urllib.error.HTTPError as e:
        try: return e.code, json.loads(e.read().decode())
        except: return e.code, {}

print("\n=== API v1/servers (Sanctum SPA) ===")
s3, r3 = api_sanctum("/api/v1/servers")
print(f"Status: {s3} | {json.dumps(r3, ensure_ascii=False)[:400]}")

print("\n=== API v1/databases ===")
s4, r4 = api_sanctum("/api/v1/databases")
print(f"Status: {s4} | {json.dumps(r4, ensure_ascii=False)[:400]}")

print("\n=== API v1/applications ===")
s5, r5 = api_sanctum("/api/v1/applications")
print(f"Status: {s5} | {json.dumps(r5, ensure_ascii=False)[:600]}")

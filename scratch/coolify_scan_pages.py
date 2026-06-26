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

# Buscar todas as páginas e extrair dados do banco
pages_to_scan = [
    "/databases",
    "/databases/new",
    "/services",
    "/projects",
    "/security/api-tokens",
    "/profile",
]

print("\n=== SCAN DE PAGINAS - DADOS DO BANCO ===")
for page in pages_to_scan:
    try:
        req2 = urllib.request.Request(f"{BASE}{page}", headers={"Referer": f"{BASE}/"})
        r2 = opener.open(req2, timeout=10)
        html2 = r2.read().decode('utf-8', errors='replace')
        
        # Buscar connection strings
        pg_uris = re.findall(r'postgresql://[^\s"\'<>&]+', html2)
        passwords = re.findall(r'POSTGRES_PASSWORD[^"]*"([^"]{6,})"', html2)
        db_names = re.findall(r'POSTGRES_DB[^"]*"([^"]{3,})"', html2)
        users = re.findall(r'POSTGRES_USER[^"]*"([^"]{3,})"', html2)
        hosts = re.findall(r'DB_HOST[^"]*"([^"]{3,})"', html2)
        ports = re.findall(r'DB_PORT[^"]*"([^"]{2,})"', html2)
        
        found_any = pg_uris or passwords or db_names
        if found_any:
            print(f"\n  [{page}]")
            for u in pg_uris: print(f"    PG URI: {u}")
            for p in passwords: print(f"    POSTGRES_PASSWORD: {p}")
            for d in db_names: print(f"    POSTGRES_DB: {d}")
            for u in users: print(f"    POSTGRES_USER: {u}")
            
        # Buscar qualquer menção a coliseu_dashboard ou dash_vendas
        if 'coliseu_dashboard' in html2 or 'dash_vendas' in html2:
            idx = html2.find('coliseu_dashboard')
            print(f"\n  [{page}] ENCONTRADO 'coliseu_dashboard'!")
            print(f"    Contexto: ...{html2[max(0,idx-100):idx+200]}...")
            
    except Exception as e:
        print(f"  [{page}]: {e}")

# Tentar acessar /api/v1 com token de sessão (algumas versões Coolify permitem)
print("\n=== TENTATIVA API COM SESSION COOKIE ===")
laravel_session = next((c.value for c in cj if 'session' in c.name.lower() or 'coolify' in c.name.lower()), '')
print(f"Session: {laravel_session[:40]}...")

req3 = urllib.request.Request(f"{BASE}/api/v1/servers", headers={
    "Accept": "application/json",
    "Cookie": f"coolify_session={laravel_session}",
    "X-CSRF-TOKEN": csrf,
    "Referer": f"{BASE}/",
})
try:
    r3 = opener.open(req3, timeout=10)
    print(f"Status: {r3.status}")
    print(r3.read().decode()[:400])
except urllib.error.HTTPError as e:
    print(f"Erro {e.code}: {e.read().decode()[:200]}")

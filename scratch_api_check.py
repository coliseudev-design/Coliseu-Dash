import urllib.request, urllib.error, json, ssl

BASE = "https://dashboard.coliseusistemas.com.br"
TENANT = "3edd56b4-e002-48ed-8ecb-131c0c62dcfb"
API_KEY = "COL-KGV7-UFY2-XEBX"

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

def get(path, headers=None):
    h = {"X-Tenant-Id": TENANT, "X-Internal-Api-Key": API_KEY}
    if headers:
        h.update(headers)
    req = urllib.request.Request(BASE + path, headers=h)
    try:
        with urllib.request.urlopen(req, context=ctx, timeout=10) as r:
            data = json.loads(r.read().decode())
            return r.status, data
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode()[:300]
    except Exception as e:
        return None, str(e)

# 1. Status de sync
status, data = get("/internal/sync/status")
print(f"=== Sync Status (HTTP {status}) ===")
print(json.dumps(data, indent=2, default=str)[:2000])

# 2. Dashboard data para DEZ 2025
status2, data2 = get("/api/dashboard/kpis?month=12&year=2025")
print(f"\n=== KPIs Dez 2025 (HTTP {status2}) ===")
print(json.dumps(data2, indent=2, default=str)[:1000])

# 3. Tentar endpoint de vendas
status3, data3 = get("/api/dashboard/vendas?month=12&year=2025&limit=5")
print(f"\n=== Vendas endpoint (HTTP {status3}) ===")
print(json.dumps(data3, indent=2, default=str)[:500])

import urllib.request, urllib.error, json, ssl

BASE = "https://dashboard.coliseusistemas.com.br"
TENANT = "3edd56b4-e002-48ed-8ecb-131c0c62dcfb"
API_KEY = "COL-KGV7-UFY2-XEBX"  # ApiKey do Release_v2.5.45

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

def call(method, path, data=None, headers=None):
    h = {
        "X-Tenant-Id": TENANT,
        "X-Internal-Api-Key": API_KEY,
        "Content-Type": "application/json"
    }
    if headers:
        h.update(headers)
    body = json.dumps(data).encode() if data is not None else None
    req = urllib.request.Request(BASE + path, data=body, headers=h, method=method)
    try:
        with urllib.request.urlopen(req, context=ctx, timeout=10) as r:
            content = r.read().decode()
            try:
                return r.status, json.loads(content)
            except:
                return r.status, content
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode()[:500]
    except Exception as e:
        return None, str(e)

# 1. Status de sync
status, data = call("GET", "/internal/sync/status")
print(f"=== Sync Status (HTTP {status}) ===")
print(json.dumps(data, indent=2, default=str)[:3000])

# 2. Tentar endpoint alternativo
status2, data2 = call("GET", "/api/bi/sync/status")
print(f"\n=== BI Sync Status (HTTP {status2}) ===")
print(str(data2)[:500])

# 3. Enviar um batch vazio para testar autenticação
status3, data3 = call("POST", "/internal/sync/dash_vendas", {"rows": []})
print(f"\n=== POST dash_vendas empty (HTTP {status3}) ===")
print(str(data3)[:500])

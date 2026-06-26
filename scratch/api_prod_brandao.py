import urllib.request
import urllib.error
import json
import ssl

TENANT = "2395efd5-6476-4f3c-a7b8-f31d5567b42f"
MW_KEY = "aQbY3eqVz2xd8PSr0AUKtfwFRo7n1IickE6sMGWTNCpXhZ95"
BASE = "https://dashboard.coliseusistemas.com.br"

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

def api_get(path):
    url = f"{BASE}{path}"
    req = urllib.request.Request(url, headers={
        "x-internal-key": MW_KEY,
        "x-tenant-id": TENANT,
        "Content-Type": "application/json"
    })
    try:
        with urllib.request.urlopen(req, context=ctx, timeout=15) as r:
            return json.loads(r.read().decode())
    except urllib.error.HTTPError as e:
        return {"error": e.code, "msg": e.read().decode()[:500]}
    except Exception as e:
        return {"error": str(e)}

print(f"Consultando: {BASE}")
print(f"Tenant: {TENANT}")

# Endpoint de faturamento por período
print("\n=== /api/comercial/faturamento (Mês Atual) ===")
r = api_get("/api/comercial/faturamento?periodo=mes_atual")
print(json.dumps(r, indent=2, ensure_ascii=False)[:1000])

print("\n=== /api/home/resumo ===")
r2 = api_get("/api/home/resumo")
print(json.dumps(r2, indent=2, ensure_ascii=False)[:1000])

print("\n=== /api/vendas/periodo?inicio=2026-06-01&fim=2026-06-25 ===")
r3 = api_get("/api/vendas/periodo?inicio=2026-06-01&fim=2026-06-25")
print(json.dumps(r3, indent=2, ensure_ascii=False)[:1000])

print("\n=== /api/home ===")
r4 = api_get("/api/home")
print(json.dumps(r4, indent=2, ensure_ascii=False)[:1000])

# Tentar endpoint de faturamento diário
print("\n=== /api/comercial/vendas-diarias ===")
r5 = api_get("/api/comercial/vendas-diarias?dataInicio=2026-06-01&dataFim=2026-06-25")
print(json.dumps(r5, indent=2, ensure_ascii=False)[:2000])

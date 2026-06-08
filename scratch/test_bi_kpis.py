import urllib.request, urllib.error, json, ssl

BASE = "https://dashboard.coliseusistemas.com.br"
TENANT = "816f97c4-66fb-4ef8-905d-e0551cbf2492"
API_KEY = "COL-BKEQ-6TAK-F55R"

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

def call(method, path, data=None, headers=None):
    h = {
        "X-Tenant-Id": TENANT,
        "X-Internal-Key": API_KEY,
        "Content-Type": "application/json",
        "X-Timezone-Offset": "-180"
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

emails = [
    "cliente@teste.com.br",
    "coliseudev@gmail.com",
    "claudio@silenus.com.br",
    "kleber@silenus.com.br",
    "robersonsouza@outlook.com",
    "kleber@coliseusistemas.com.br",
    "daniel@silenus.com.br",
    "admin@coliseu.com.br",
    "admin@silenus.com.br"
]

for email in emails:
    status, auth_data = call("POST", "/api/auth/login", data={"email": email, "password": "any"})
    print(f"Login for {email}: HTTP {status}")
    if status == 200:
        print("Success! Token obtained.")
        token = auth_data["token"]
        
        headers = {
            "Authorization": f"Bearer {token}"
        }

        # Test executive-summary
        status_ex, data_ex = call("GET", "/api/bi/sales/executive-summary?period=thisMonth", headers=headers)
        print(f"  Executive Summary: HTTP {status_ex}")
        if status_ex == 200:
            print(f"  Faturamento: {data_ex.get('executive_summary', {}).get('faturamento')}")
            print(f"  Qtd Pedidos: {data_ex.get('executive_summary', {}).get('quantidade_pedidos')}")

        # Test commercial-kpis
        status_ck, data_ck = call("GET", "/api/bi/sales/commercial-kpis?period=thisMonth", headers=headers)
        print(f"  Commercial KPIs: HTTP {status_ck}")
        if status_ck == 200:
            print(f"  Produtos vendidos: {data_ck.get('produtos_vendidos')}")
            print(f"  Faturamento Total: {data_ck.get('faturamento_total')}")
            print(f"  Total Pedidos: {data_ck.get('total_pedidos')}")
        break

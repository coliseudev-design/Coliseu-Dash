import urllib.request, urllib.error, json, ssl

BASE = "http://177.39.17.7"
TENANT = "816f97c4-66fb-4ef8-905d-e0551cbf2492"
API_KEY = "COL-BKEQ-6TAK-F55R"

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

def call(method, path, data=None, headers=None):
    h = {
        "X-Tenant-Id": TENANT,
        "X-Internal-Key": API_KEY,
        "Host": "dashboard.coliseusistemas.com.br",
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

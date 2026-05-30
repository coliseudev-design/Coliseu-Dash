import urllib.request, urllib.error, json, ssl

BASE_URL = "https://dashboard.coliseusistemas.com.br"
EMAIL = "thiago@vet.com.br"
PASSWORD = "123456"

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

def login():
    url = f"{BASE_URL}/api/auth/login"
    payload = {"email": EMAIL, "password": PASSWORD}
    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode(),
        headers={"Content-Type": "application/json"}
    )
    try:
        with urllib.request.urlopen(req, context=ctx) as res:
            return json.loads(res.read().decode())
    except Exception as e:
        print("Login failed:", e)
        return None

def call_api(path, token):
    url = f"{BASE_URL}{path}"
    req = urllib.request.Request(
        url,
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
    )
    try:
        with urllib.request.urlopen(req, context=ctx) as res:
            return res.status, json.loads(res.read().decode())
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode()
    except Exception as e:
        return None, str(e)

data = login()
if data and "token" in data:
    token = data["token"]
    user = data["user"]
    print(f"Logged in successfully! User: {user['nome']}, Tenant: {user['tenant_id']}, Layout: {user['layout_version']}")
    
    # 1. Test /api/ranking/vendedores
    print("\n--- Testing Ranking Vendedores Dez 2025 ---")
    status, res = call_api("/api/ranking/vendedores?period=custom&start_date=2025-12-01&end_date=2025-12-31", token)
    print(f"Status: {status}")
    print("Response:", json.dumps(res, indent=2))
else:
    print("Failed to log in.")

import urllib.request, json, ssl

BASE_URL = "http://177.39.17.7:33744"
EMAIL = "coliseudev@gmail.com"
PASSWORD = "any"

def login():
    url = f"{BASE_URL}/api/auth/login"
    payload = {"email": EMAIL, "password": PASSWORD}
    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode(),
        headers={"Content-Type": "application/json"}
    )
    try:
        with urllib.request.urlopen(req) as res:
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
        with urllib.request.urlopen(req) as res:
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
    
    # Test api/sync/status
    print("\n--- Testing /api/sync/status ---")
    status, res = call_api("/api/sync/status", token)
    print(f"Status: {status}")
    print("Response:", json.dumps(res, indent=2))
    
    # Test api/ranking/vendedores
    print("\n--- Testing /api/ranking/vendedores ---")
    status, res = call_api("/api/ranking/vendedores?period=thisMonth&depto_id=1&limit=10", token)
    print(f"Status: {status}")
    print("Response:", json.dumps(res, indent=2))
else:
    print("Failed to log in.")

import urllib.request
import urllib.error
import json
import ssl

BASE_URL = "https://dashboard.coliseusistemas.com.br"

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

def post_login(email):
    url = f"{BASE_URL}/api/auth/login"
    payload = {"email": email, "password": "any_password_works"}
    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode(),
        headers={"Content-Type": "application/json"}
    )
    try:
        with urllib.request.urlopen(req, context=ctx) as res:
            data = json.loads(res.read().decode())
            return res.status, data
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode()
    except Exception as e:
        return None, str(e)

def call_api(method, path, token, data=None):
    url = f"{BASE_URL}{path}"
    body = json.dumps(data).encode() if data is not None else None
    req = urllib.request.Request(
        url,
        data=body,
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        },
        method=method
    )
    try:
        with urllib.request.urlopen(req, context=ctx) as res:
            return res.status, json.loads(res.read().decode())
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode()
    except Exception as e:
        return None, str(e)

def post_register(nome, email, password, company_key):
    url = f"{BASE_URL}/api/auth/register"
    payload = {
        "nome": nome,
        "email": email,
        "password": password,
        "companyKey": company_key
    }
    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode(),
        headers={"Content-Type": "application/json"}
    )
    try:
        with urllib.request.urlopen(req, context=ctx) as res:
            return res.status, json.loads(res.read().decode())
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode()
    except Exception as e:
        return None, str(e)

# Register a v3 user under tenant 3edd56b4-e002-48ed-8ecb-131c0c62dcfb
v3_email = "test_vetseed_v3@coliseudev.com.br"
reg_status, reg_res = post_register("Vetseed V3 Test", v3_email, "pass123", "3edd56b4-e002-48ed-8ecb-131c0c62dcfb")
print(f"=== Register Status: {reg_status} ===")
print("Register response:", reg_res)

# Log in as the v3 user
status, login_res = post_login(v3_email)
if status == 200:
    token = login_res["token"]
    user = login_res["user"]
    print("\nSuccessfully logged in!")
    print("  User ID:", user["id"])
    print("  Name:", user["nome"])
    print("  Tenant ID:", user["tenant_id"])
    print("  Layout Version:", user["layout_version"])
    
    # Query overview for December 2025 (Layout v3.0 - no CFOP filters)
    print("\n=== Getting Overview for Dec 2025 for Tenant 3edd (Layout v3.0) ===")
    st_ov, ov_data = call_api("GET", "/api/estatisticas/overview?period=custom&start_date=2025-12-01&end_date=2025-12-31", token)
    print(f"Overview Status: {st_ov}")
    print(f"  mes total: {ov_data.get('mes', {}).get('total')} | mes qtd: {ov_data.get('mes', {}).get('qtd')}")
    
    # Query overview for April 2026 (Layout v3.0 - no CFOP filters)
    print("\n=== Getting Overview for Apr 2026 for Tenant 3edd (Layout v3.0) ===")
    st_ov2, ov_data2 = call_api("GET", "/api/estatisticas/overview?period=custom&start_date=2026-04-01&end_date=2026-04-30", token)
    print(f"Overview Status: {st_ov2}")
    print(f"  mes total: {ov_data2.get('mes', {}).get('total')} | mes qtd: {ov_data2.get('mes', {}).get('qtd')}")
else:
    print("Login Failed:", login_res)

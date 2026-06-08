import urllib.request
import json
import ssl

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

def test_url(url, label):
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, context=ctx, timeout=5) as response:
            status = response.getcode()
            body = response.read().decode('utf-8')
            print(f"=== {label} ({url}) ===")
            print(f"Status: {status}")
            print(f"Body: {body}")
    except Exception as e:
        print(f"=== {label} ({url}) ===")
        print(f"Failed: {e}")

test_url("https://dashboard.coliseusistemas.com.br/health/readiness", "Public FQDN")
test_url("http://177.39.17.50:33889/health/readiness", "VPS IP on Port 33889")
test_url("http://177.39.17.7:33889/health/readiness", "VPS Internal IP on Port 33889")

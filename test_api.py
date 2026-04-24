import urllib.request
import json

try:
    req = urllib.request.Request('http://177.39.17.7:3000/api/health')
    with urllib.request.urlopen(req) as response:
        print("Health:", response.read().decode())
except Exception as e:
    print("Health error:", e)


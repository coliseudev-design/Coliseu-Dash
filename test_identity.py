import urllib.request
import urllib.error

url = 'https://adminlicencas.coliseusistemas.com.br/internal/companies/c06a45f5-0000-0000-0000-000000000000/branches'
key = 'Coliseu2026!IdentitySuperSecretKeyOauth20'

req = urllib.request.Request(url, headers={'x-internal-api-key': key})
try:
    with urllib.request.urlopen(req) as response:
        print(response.status)
        print(response.read().decode('utf-8'))
except urllib.error.HTTPError as e:
    print(e.code)
    print(e.read().decode('utf-8'))

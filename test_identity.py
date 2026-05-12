import urllib.request
import json

req = urllib.request.Request('https://adminlicencas.coliseusistemas.com.br/internal/companies/e0c660bb-6d0e-47fc-8f74-325b341f2bd9/firebird-config')
req.add_header('X-Internal-Api-Key', 'Coliseu2026!IdentitySuperSecretKeyOauth20')

try:
    with urllib.request.urlopen(req) as response:
        print(response.read().decode('utf-8'))
except urllib.error.HTTPError as e:
    print('HTTP Error', e.code, e.reason)
    print(e.read().decode('utf-8'))

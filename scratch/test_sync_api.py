"""
Testar chamada de sync para o endpoint /internal/sync/dash_vendas_itens com o header correto X-Internal-Key
"""
import urllib.request
import json
import ssl

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

url = "https://dashboard.coliseusistemas.com.br/internal/sync/dash_vendas_itens"
tenant_id = "2395efd5-6476-4f3c-a7b8-f31d5567b42f"
api_key = "COL-NK9B-8AUP-VA5A"

headers = {
    'Content-Type': 'application/json',
    'X-Tenant-Id': tenant_id,
    'X-Internal-Key': api_key,
    'User-Agent': 'ColiseuSales.Worker'
}

# Payload com 1 item de teste
payload = {
    "rows": [
        {
            "id_firebird": 680881018,
            "venda_id_firebird": 680881,
            "produto_id_firebird": 464,
            "quantidade": 314.0,
            "preco_unitario": 157.36,
            "custo_unitario": 0,
            "valor_total": 49411.04,
            "desconto_item": 30.732078,
            "vendedor": "",
            "produto": "EUCALIPTO TRATADO 11 A 13 2.7 MT",
            "marca": "",
            "categoria": "",
            "depto_id": 1
        }
    ]
}

data = json.dumps(payload).encode('utf-8')
req = urllib.request.Request(url, data=data, headers=headers, method='POST')

try:
    with urllib.request.urlopen(req, timeout=10, context=ctx) as resp:
        print(f"Status: {resp.status}")
        print(f"Response: {resp.read().decode('utf-8')}")
except urllib.error.HTTPError as e:
    print(f"HTTP Error {e.code}: {e.read().decode('utf-8')}")
except Exception as e:
    print(f"Error: {e}")

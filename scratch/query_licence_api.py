import urllib.request
import json

def query_tenant(tenant_id):
    url = f"https://adminlicencas.coliseusistemas.com.br/internal/companies/{tenant_id}/modules/coliseu-dash/info"
    req = urllib.request.Request(url)
    req.add_header('X-Internal-Api-Key', 'aQbY3eqVz2xd8PSr0AUKtfwFRo7n1IickE6sMGWTNCpXhZ95')
    try:
        with urllib.request.urlopen(req) as response:
            html = response.read().decode('utf-8')
            data = json.loads(html)
            print(f"Tenant {tenant_id}: {data.get('nomeDaEmpresa', 'N/A')}")
    except Exception as e:
        print(f"Error for {tenant_id}: {e}")

query_tenant("a822a7e7-fdd4-4483-bbb5-26587a72739f")
query_tenant("ed1d3a98-4c4d-48db-99c0-8751926eb8e5")

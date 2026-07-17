import requests

def test_comparativo():
    url = "https://dashboard.coliseusistemas.com.br/api/bi/sales/commercial-kpis"
    
    # We need a valid token. Let's get it by logging in or from our DB.
    # Since we can query the database, let's just make the request directly on the local port 3000 of the VPS!
    # On the VPS, the middleware is running on a port (or we can query localhost).
    # Let's write a python script that runs inside the VPS itself!
    # That way it has local access and we don't need to expose tokens.
    pass

if __name__ == '__main__':
    test_comparativo()

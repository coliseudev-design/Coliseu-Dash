import urllib.request

def check_url(url):
    try:
        req = urllib.request.Request(url)
        with urllib.request.urlopen(req) as res:
            print(f"URL: {url}")
            print(f"  Status: {res.status}")
            print(f"  Server: {res.headers.get('Server')}")
            print(f"  Headers: {res.headers}")
    except Exception as e:
        print(f"Error checking {url}: {e}")

check_url("https://dashboard.coliseusistemas.com.br/")
check_url("http://177.39.17.7:3200/health/liveness")

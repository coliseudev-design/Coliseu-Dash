import socket

domains = [
    "adminlicencas.coliseusistemas.com.br",
    "licencas.coliseusistemas.com.br",
    "dashboard.coliseusistemas.com.br",
    "garantias.coliseusistemas.com.br",
    "api.garantias.coliseusistemas.com.br"
]

for d in domains:
    try:
        ip = socket.gethostbyname(d)
        print(f"Domain: {d} -> IP: {ip}")
    except Exception as e:
        print(f"Domain: {d} -> Error: {e}")

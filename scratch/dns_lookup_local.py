import socket

def lookup(host):
    try:
        ip = socket.gethostbyname(host)
        print(f"{host} resolves to {ip}")
    except Exception as e:
        print(f"Error resolving {host}: {e}")

lookup("dashboard.coliseusistemas.com.br")
lookup("adminlicencas.coliseusistemas.com.br")

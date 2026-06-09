import socket

def check_dns(domain):
    try:
        ip = socket.gethostbyname(domain)
        print(f"Domain: {domain} -> IP: {ip}")
    except Exception as e:
        print(f"Domain: {domain} -> Failed: {e}")

check_dns("dashboard.coliseusistemas.com.br")
check_dns("adminlicencas.coliseusistemas.com.br")
check_dns("licencas.coliseusistemas.com.br")

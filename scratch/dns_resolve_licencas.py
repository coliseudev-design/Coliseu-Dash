import socket

try:
    ip = socket.gethostbyname('adminlicencas.coliseusistemas.com.br')
    print(f"adminlicencas.coliseusistemas.com.br resolves to: {ip}")
except Exception as e:
    print(f"Error: {e}")

import socket

try:
    ip = socket.gethostbyname('dashboard.coliseusistemas.com.br')
    print(f"dashboard.coliseusistemas.com.br resolves to: {ip}")
except Exception as e:
    print(f"Error: {e}")

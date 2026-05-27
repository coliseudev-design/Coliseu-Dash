import socket

try:
    ip = socket.gethostbyname('dashboard.coliseusistemas.com.br')
    print("dashboard.coliseusistemas.com.br resolves to:", ip)
except Exception as e:
    print("Failed to resolve:", e)

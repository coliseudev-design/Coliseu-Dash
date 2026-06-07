import socket
try:
    ip = socket.gethostbyname('adminlicencas.coliseusistemas.com.br')
    print("IP of adminlicencas.coliseusistemas.com.br:", ip)
except Exception as e:
    print("Error resolving:", e)

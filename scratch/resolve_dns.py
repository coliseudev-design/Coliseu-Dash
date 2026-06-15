import socket

try:
    ip = socket.gethostbyname('adminlicencas.coliseusistemas.com.br')
    print('adminlicencas.coliseusistemas.com.br IP:', ip)
except Exception as e:
    print('Error resolving DNS:', e)

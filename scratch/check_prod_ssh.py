import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
try:
    client.connect('2.24.82.19', username='root', password='6EFBC!c0:wzr%Ij', timeout=5)
    print("SSH conectado com sucesso na Produção!")
    stdin, stdout, stderr = client.exec_command("docker ps --format '{{.Names}}'")
    print(stdout.read().decode('utf-8'))
except Exception as e:
    print("Erro ao conectar na Produção via SSH:", e)
finally:
    client.close()

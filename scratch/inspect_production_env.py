import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('177.39.17.7', username='root', password='6EFBC!c0:wzr%Ij')

# Inspeciona as variáveis de ambiente do middleware de produção
stdin, stdout, stderr = client.exec_command(
    "docker inspect dashboard-middleware-irerzifjwjb4q8ucbpfk2gb8-201101912420 --format '{{range .Config.Env}}{{println .}}{{end}}'"
)
print("=== Middleware Production Env ===")
print(stdout.read().decode('utf-8'))

# Inspeciona as variáveis de ambiente do container do banco de dados principal
stdin, stdout, stderr = client.exec_command(
    "docker inspect coliseu-db-thyqkc5gkvp7i1nld555wakz-172547374937 --format '{{range .Config.Env}}{{println .}}{{end}}'"
)
print("=== Database Production Env ===")
print(stdout.read().decode('utf-8'))

client.close()

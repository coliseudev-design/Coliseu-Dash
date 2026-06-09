import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('177.39.17.7', username='root', password='6EFBC!c0:wzr%Ij')

# Testando busca de filiais para o tenant de Piveta (ed1d3a98-4c4d-48db-99c0-8751926eb8e5)
cmd_piveta = (
    "curl -s -H 'x-internal-api-key: Coliseu2026!IdentitySuperSecretKeyOauth20' "
    "https://adminlicencas.coliseusistemas.com.br/internal/companies/ed1d3a98-4c4d-48db-99c0-8751926eb8e5/branches"
)

# Testando busca de filiais para o tenant de Petclub (816f97c4-66fb-4ef8-905d-e0551cbf2492)
cmd_petclub = (
    "curl -s -H 'x-internal-api-key: Coliseu2026!IdentitySuperSecretKeyOauth20' "
    "https://adminlicencas.coliseusistemas.com.br/internal/companies/816f97c4-66fb-4ef8-905d-e0551cbf2492/branches"
)

print("=== Filiais de Piveta (Identity Server) ===")
stdin, stdout, stderr = client.exec_command(cmd_piveta)
print(stdout.read().decode('utf-8'))

print("=== Filiais de Petclub (Identity Server) ===")
stdin, stdout, stderr = client.exec_command(cmd_petclub)
print(stdout.read().decode('utf-8'))

client.close()

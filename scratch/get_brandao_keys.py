import paramiko

SSH_HOST = '177.39.17.7'
SSH_USER = 'root'
SSH_PASS = '6EFBC!c0:wzr%Ij'
TENANT = "2395efd5-6476-4f3c-a7b8-f31d5567b42f"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(SSH_HOST, username=SSH_USER, password=SSH_PASS)

def run(cmd):
    stdin, stdout, stderr = client.exec_command(cmd)
    return stdout.read().decode('utf-8', errors='replace').strip()

# Buscar na identity API as chaves do tenant Brandão
print("=== BUSCAR EMPRESA NO IDENTITY DB ===")
# Identity DB
ID_CONTAINER = "db-backup-bqc1xkwidahlyju489u3gxnq-230206501636"

# Verificar containers do identity
print(run("docker ps --format '{{.Names}}' | grep -i 'identity\\|admin\\|licenca'"))

# Verificar variáveis de ambiente do middleware para pegar a InternalApiKey
MW = "dashboard-middleware-irerzifjwjb4q8ucbpfk2gb8-025654671008"
print("\n=== ENV DO MIDDLEWARE (chaves) ===")
envs = run(f"docker exec {MW} env 2>&1 | grep -i 'key\\|api\\|tenant\\|jwt\\|internal' | head -30")
print(envs)

# Logs do middleware para ver se aparece o tenant Brandao
print("\n=== LOGS MIDDLEWARE (ultimas 30 linhas) ===")
logs = run(f"docker logs {MW} --tail 30 2>&1")
print(logs)

client.close()

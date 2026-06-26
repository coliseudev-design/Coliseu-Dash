import paramiko
import json

# Servidor de PRODUCAO onde o Dashboard real está
SSH_HOSTS = [
    ('2.24.82.19', 'root', '6EFBC!c0:wzr%Ij'),
    ('2.24.82.19', 'root', 'ColiseuDB2026Prod'),
    ('2.24.82.19', 'root', 'masterkey'),
]

TENANT = "2395efd5-6476-4f3c-a7b8-f31d5567b42f"

ERP = {
    "2026-06-01": 73131.16,  "2026-06-02": 72027.90,  "2026-06-03": 101117.04,
    "2026-06-04": 321.00,    "2026-06-05": 76965.70,  "2026-06-06": 52996.35,
    "2026-06-08": 49924.37,  "2026-06-09": 74591.49,  "2026-06-10": 102500.01,
    "2026-06-11": 64853.19,  "2026-06-12": 129899.60, "2026-06-13": 896.53,
    "2026-06-15": 64827.29,  "2026-06-16": 108572.58, "2026-06-17": 79868.95,
    "2026-06-18": 71037.29,  "2026-06-19": 68468.84,  "2026-06-20": 35646.73,
    "2026-06-22": 55800.83,  "2026-06-23": 71686.58,  "2026-06-24": 73317.10,
    "2026-06-25": 38370.17,
}

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())

connected = False
for host, user, pwd in SSH_HOSTS:
    try:
        client.connect(host, username=user, password=pwd, timeout=10)
        print(f"SSH CONECTADO: {user}@{host}")
        connected = True
        break
    except Exception as e:
        print(f"Falha {user}@{host}: {e}")

if not connected:
    print("Nao conseguiu conectar via SSH em 2.24.82.19")
    exit(1)

def run(cmd):
    stdin, stdout, stderr = client.exec_command(cmd)
    return stdout.read().decode('utf-8', errors='replace').strip()

# Listar containers
print("\n=== CONTAINERS EM 2.24.82.19 ===")
print(run("docker ps --format 'table {{.Names}}\t{{.Status}}' 2>&1 | head -20"))

# Encontrar o container do banco
print("\n=== CONTAINER DB ===")
db_containers = run("docker ps --format '{{.Names}}' 2>&1 | grep -i 'db\\|postgres\\|coliseu'")
print(db_containers)

client.close()

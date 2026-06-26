import paramiko

SSH_HOST = '177.39.17.7'
SSH_USER = 'root'
SSH_PASS = '6EFBC!c0:wzr%Ij'
MW = "dashboard-middleware-irerzifjwjb4q8ucbpfk2gb8-025654671008"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(SSH_HOST, username=SSH_USER, password=SSH_PASS)

def run(cmd):
    stdin, stdout, stderr = client.exec_command(cmd)
    return stdout.read().decode('utf-8', errors='replace').strip()

# 1. Todas as variáveis de ambiente do middleware (DB connection)
print("=== ENV MIDDLEWARE - DB CONNECTION ===")
print(run(f"docker exec {MW} env 2>&1 | grep -iE 'pg|postgres|database|db_|host|port|user|pass' | sort"))

# 2. Verificar qual postgres o middleware realmente usa
print("\n=== ARQUIVO ENV DO MIDDLEWARE ===")
print(run(f"docker exec {MW} cat .env 2>/dev/null || echo 'sem .env'"))
print(run(f"docker exec {MW} cat /app/.env 2>/dev/null || echo 'sem /app/.env'"))

# 3. Verificar conexões ativas do middleware
print("\n=== CONEXOES ATIVAS DO MIDDLEWARE ===")
print(run(f"docker exec {MW} sh -c 'cat /proc/net/tcp 2>/dev/null | head -20 || ss -tn 2>/dev/null | head -20'"))

# 4. Verificar o arquivo de config do middleware
print("\n=== CONFIG JS DO MIDDLEWARE ===")
print(run(f"docker exec {MW} find /app -name 'env.js' -o -name 'config.js' -o -name 'database.js' 2>/dev/null | head -5"))
print(run(f"docker exec {MW} cat /app/src/config/env.js 2>/dev/null || docker exec {MW} cat /app/src/config/database.js 2>/dev/null"))

client.close()

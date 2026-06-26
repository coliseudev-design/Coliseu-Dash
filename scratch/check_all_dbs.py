import paramiko

SSH_HOST = '177.39.17.7'
SSH_USER = 'root'
SSH_PASS = '6EFBC!c0:wzr%Ij'
DB_CONTAINER = "coliseu-db-thyqkc5gkvp7i1nld555wakz-172547374937"
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
client.connect(SSH_HOST, username=SSH_USER, password=SSH_PASS)

def run(cmd):
    stdin, stdout, stderr = client.exec_command(cmd)
    return stdout.read().decode('utf-8', errors='replace').strip()

def pg(sql):
    cmd = f"""docker exec -e PGPASSWORD=ColiseuDB2026Prod {DB_CONTAINER} psql -U coliseu_admin -d coliseu_dashboard -t -A -F'|' -c "{sql}" 2>&1"""
    stdin, stdout, stderr = client.exec_command(cmd)
    return stdout.read().decode('utf-8', errors='replace').strip()

# Verificar TODOS os databases disponíveis no servidor postgres
print("=== DATABASES DISPONIVEIS ===")
print(pg("SELECT datname FROM pg_database ORDER BY datname"))

# Verificar se existe outro DB com nome diferente
print("\n=== TODOS OS TENANTS EM coliseu_dashboard ===")
print(pg("SELECT tenant_id, COUNT(*) qtd, MAX(data_venda)::date ultima FROM dash_vendas GROUP BY tenant_id ORDER BY ultima DESC NULLS LAST"))

# Verificar se o worker appsettings aponta para o DashboardApi correto
print("\n=== APPSETTINGS DO WORKER ===")
try:
    import json
    with open(r"C:\Coliseu\ColiseuSincronizador\appsettings.json", encoding='utf-8') as f:
        cfg = json.load(f)
    print(f"  DashboardApi.BaseUrl: {cfg.get('DashboardApi',{}).get('BaseUrl','')}")
    print(f"  DashboardApi.InternalApiKey: {cfg.get('DashboardApi',{}).get('InternalApiKey','')}")
    print(f"  VpsApi.CompanyId: {cfg.get('VpsApi',{}).get('CompanyId','')}")
    print(f"  IdentityApi.TenantId: {cfg.get('IdentityApi',{}).get('TenantId','')}")
    print(f"  Firebird.Database: {cfg.get('Firebird',{}).get('Database','')}")
    print(f"  Worker.ServiceSuffix: {cfg.get('Worker',{}).get('ServiceSuffix','')}")
except Exception as e:
    print(f"  ERRO: {e}")

# Verificar logs do worker para ver pra onde ele está mandando dados
print("\n=== LOGS WORKER (se rodando) ===")
print(run("Get-WinEvent -LogName Application -Newest 20 2>$null | Select-Object Message | Format-List 2>&1 || echo 'sem logs'"))

client.close()

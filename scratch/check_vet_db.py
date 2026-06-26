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

def pg(db, sql):
    cmd = f"""docker exec -e PGPASSWORD=ColiseuDB2026Prod {DB_CONTAINER} psql -U coliseu_admin -d {db} -t -A -F'|' -c "{sql}" 2>&1"""
    stdin, stdout, stderr = client.exec_command(cmd)
    return stdout.read().decode('utf-8', errors='replace').strip()

# 1. Verificar banco VET
print("=== TENANTS NO coliseu_dashboard_vet ===")
r = pg("coliseu_dashboard_vet", "SELECT tenant_id, COUNT(*) qtd, ROUND(SUM(valor_total - COALESCE(valor_desconto,0))::numeric,2) total, MAX(data_venda)::date ultima FROM dash_vendas WHERE data_venda >= '2026-06-01' AND UPPER(TRIM(status)) IN ('FATURADO','FINALIZADO','PROCESSADO') GROUP BY tenant_id ORDER BY total DESC")
print(r if r else "VAZIO")

# 2. Verificar o tenant 2395efd5 em coliseu_dashboard_vet
print(f"\n=== TENANT BRANDAO em coliseu_dashboard_vet ===")
r2 = pg("coliseu_dashboard_vet", f"SELECT COUNT(*) qtd, ROUND(SUM(valor_total-COALESCE(valor_desconto,0))::numeric,2) total FROM dash_vendas WHERE tenant_id = '{TENANT}'")
print(r2)

# 3. Verificar todos tenants sem filtro de data
print(f"\n=== TODOS TENANTS (sem filtro data) em coliseu_dashboard ===")
r3 = pg("coliseu_dashboard", "SELECT tenant_id, COUNT(*) qtd, ROUND(SUM(valor_total - COALESCE(valor_desconto,0))::numeric,2) total, MAX(data_venda)::date ultima FROM dash_vendas GROUP BY tenant_id ORDER BY total DESC")
print(r3)

# 4. Verificar coliseu_identity para encontrar empresa Brandão
print("\n=== EMPRESAS EM coliseu_identity ===")
r4 = pg("coliseu_identity", "SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name")
print(r4)

client.close()

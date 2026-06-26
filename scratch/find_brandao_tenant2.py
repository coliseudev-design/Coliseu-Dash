import paramiko

SSH_HOST = '177.39.17.7'
SSH_USER = 'root'
SSH_PASS = '6EFBC!c0:wzr%Ij'
DB_CONTAINER = "coliseu-db-thyqkc5gkvp7i1nld555wakz-172547374937"
DB_USER = "coliseu_admin"
DB_NAME = "coliseu_dashboard"

# Valores corretos do ERP (extraídos das imagens)
ERP = {
    "2026-06-01": 73131.16,
    "2026-06-02": 72027.90,
    "2026-06-03": 101117.04,
    "2026-06-04": 321.00,
    "2026-06-05": 76965.70,
    "2026-06-06": 52996.35,
    "2026-06-08": 49924.37,
    "2026-06-09": 74591.49,
    "2026-06-10": 102500.01,
    "2026-06-11": 64853.19,
    "2026-06-12": 129899.60,
    "2026-06-13": 896.53,
    "2026-06-15": 64827.29,
    "2026-06-16": 108572.58,
    "2026-06-17": 79868.95,
    "2026-06-18": 71037.29,
    "2026-06-19": 68468.84,
    "2026-06-20": 35646.73,
    "2026-06-22": 55800.83,
    "2026-06-23": 71686.58,
    "2026-06-24": 73317.10,
    "2026-06-25": 38370.17,
}

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(SSH_HOST, username=SSH_USER, password=SSH_PASS)

def pg(sql):
    safe = sql.replace('"', '\\"').replace('$', '\\$')
    cmd = f'docker exec {DB_CONTAINER} psql -U {DB_USER} -d {DB_NAME} -t -A -F"|" -c "{safe}" 2>&1'
    stdin, stdout, stderr = client.exec_command(cmd)
    return stdout.read().decode('utf-8').strip()

# Passo 1: descobrir tenant_id do Brandão Teste
print("=== TODOS OS TENANTS COM VENDAS RECENTES ===")
r = pg("""
SELECT tenant_id,
       COUNT(*) as qtd,
       ROUND(SUM(valor_total - COALESCE(valor_desconto,0))::numeric,2) as total,
       MAX(data_venda)::date as max_data
FROM dash_vendas
WHERE data_venda >= '2026-05-01'
  AND UPPER(TRIM(status)) IN ('FATURADO','FINALIZADO','PROCESSADO')
GROUP BY tenant_id
ORDER BY total DESC
""")
print(r)

# Passo 2: Verificar qual tenant tem ~1.464.094,36 em junho
print("\n=== TENANT COM TOTAL PROXIMO A 1.464.094 EM JUNHO ===")
r2 = pg("""
SELECT tenant_id,
       ROUND(SUM(valor_total - COALESCE(valor_desconto,0))::numeric,2) as total_junho
FROM dash_vendas
WHERE data_venda >= '2026-06-01' AND data_venda < '2026-06-26'
  AND UPPER(TRIM(status)) IN ('FATURADO','FINALIZADO','PROCESSADO')
  AND UPPER(TRIM(COALESCE(especie,''))) != 'GARANTIA'
GROUP BY tenant_id
ORDER BY total_junho DESC
""")
print(r2)

# Passo 3: Tabelas de empresa/tenant
print("\n=== TABELAS EXISTENTES ===")
r3 = pg("""
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name
""")
print(r3)

client.close()

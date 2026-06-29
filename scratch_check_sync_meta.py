"""
Consultar dash_sync_metadata e dash_log_atividades para ver progresso do sync
"""
import paramiko

HOST = '2.24.82.19'
USER = 'root'
PASS = 'Col@13894645'
CONTAINER = 'vasjsucz4yxcb7m4rtqindd2'
T = "'2395efd5-6476-4f3c-a7b8-f31d5567b42f'"

def run(client, sql, desc=""):
    cmd = f"docker exec {CONTAINER} psql -U coliseu_admin -d coliseu_dashboard -c \"{sql}\""
    _, stdout, _ = client.exec_command(cmd)
    out = stdout.read().decode('utf-8')
    if desc:
        print(f"\n{'='*60}\n=== {desc} ===\n{'='*60}")
    print(out)
    return out

def run_sh(client, cmd, desc=""):
    if desc:
        print(f"\n{'='*60}\n=== {desc} ===\n{'='*60}")
    _, stdout, _ = client.exec_command(cmd)
    out = stdout.read().decode('utf-8')
    print(out)
    return out

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PASS, timeout=20)

# 1. Estrutura da tabela sync_metadata
run(client, "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'dash_sync_metadata' ORDER BY ordinal_position;", "1. ESTRUTURA dash_sync_metadata")

# 2. Todos os registros de sync_metadata para o tenant
run(client, f"SELECT * FROM dash_sync_metadata WHERE tenant_id = {T} ORDER BY tabela, updated_at DESC;", "2. PROGRESSO DE SYNC POR TABELA")

# 3. Todos os registros (sem filtro de tenant, para ver outros tenants e comparar)
run(client, "SELECT tenant_id, tabela, ultimo_id_sincronizado, ultima_sincronizacao, total_sincronizado, updated_at FROM dash_sync_metadata ORDER BY tabela, updated_at DESC LIMIT 30;", "3. SYNC_METADATA GLOBAL (todos os tenants)")

# 4. dash_log_atividades - últimas atividades de sync
run(client, "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'dash_log_atividades' ORDER BY ordinal_position;", "4. ESTRUTURA dash_log_atividades")

run(client, f"SELECT * FROM dash_log_atividades WHERE tenant_id = {T} ORDER BY created_at DESC LIMIT 20;", "5. ÚLTIMAS ATIVIDADES DO TENANT (dash_log_atividades)")

# 6. Verificar o último id sincronizado vs o max id no banco
run(client, f"""
SELECT 
  sm.tabela,
  sm.ultimo_id_sincronizado,
  sm.ultima_sincronizacao,
  sm.total_sincronizado,
  (SELECT MAX(id_firebird) FROM dash_vendas WHERE tenant_id = {T}) as max_id_banco,
  (SELECT COUNT(*) FROM dash_vendas WHERE tenant_id = {T}) as total_banco
FROM dash_sync_metadata sm
WHERE sm.tenant_id = {T}
  AND sm.tabela = 'dash_vendas';
""", "6. ÚLTIMO ID SYNC vs MAX ID NO BANCO (dash_vendas)")

# 7. Ver o que o sync está mostrando no middleware agora
MW = 'dashboard-middleware-g115wwb76cltjli9wew0cgfi-192717627336'
run_sh(client, f"docker logs --since 5m {MW} 2>&1 | grep -i 'sync\\|sincron\\|chunk\\|lote\\|progresso\\|metadata\\|pending\\|worker' | tail -30", "7. LOGS DE SYNC DO MIDDLEWARE (últimos 5 min)")

client.close()

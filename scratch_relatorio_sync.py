"""
RELATÓRIO PÓS-SINCRONISMO
Verificar:
1. Totais atuais vs ERP após novo sync
2. Logs do worker de sincronização
3. Gaps de IDs que podem indicar registros não sincronizados
4. Status do worker
"""
import paramiko, json

HOST = '2.24.82.19'
USER = 'root'
PASS = 'Col@13894645'
DB_CONTAINER = 'vasjsucz4yxcb7m4rtqindd2'
T = "'2395efd5-6476-4f3c-a7b8-f31d5567b42f'"
FILTER = "AND UPPER(TRIM(status)) IN ('FATURADO','FINALIZADO','PROCESSADO') AND (UPPER(TRIM(COALESCE(especie,''))) != 'GARANTIA' OR (COALESCE(valor_total,0)-COALESCE(valor_desconto,0))>=0)"

def run_db(client, sql, desc=""):
    cmd = f"docker exec {DB_CONTAINER} psql -U coliseu_admin -d coliseu_dashboard -c \"{sql}\""
    _, stdout, _ = client.exec_command(cmd)
    out = stdout.read().decode('utf-8')
    if desc:
        print(f"\n{'='*60}\n=== {desc} ===\n{'='*60}")
    print(out)
    return out

def run_sh(client, cmd, desc=""):
    if desc:
        print(f"\n{'='*60}\n=== {desc} ===\n{'='*60}")
    _, stdout, stderr = client.exec_command(cmd)
    out = stdout.read().decode('utf-8')
    err = stderr.read().decode('utf-8')
    if out: print(out)
    if err and 'level' not in err and 'WARN' not in err.upper(): print("ERR:", err[:300])
    return out

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PASS, timeout=30)

print("=" * 60)
print("RELATÓRIO DE SINCRONISMO - " + __import__('datetime').datetime.now().strftime('%d/%m/%Y %H:%M'))
print("=" * 60)

# ============================================================
# 1. TOTAIS ATUAIS PÓS-SYNC vs ERP
# ============================================================
run_db(client, f"""
SELECT 
  TO_CHAR(data_venda, 'YYYY-MM') as mes,
  COUNT(*) as qtd_vendas,
  SUM(valor_total - COALESCE(valor_desconto, 0)) as total_dash,
  CASE TO_CHAR(data_venda, 'YYYY-MM')
    WHEN '2026-04' THEN 608819.01
    WHEN '2026-05' THEN 1776423.83
    WHEN '2026-06' THEN 1488803.85
  END as erp_referencia,
  SUM(valor_total - COALESCE(valor_desconto, 0)) - CASE TO_CHAR(data_venda, 'YYYY-MM')
    WHEN '2026-04' THEN 608819.01
    WHEN '2026-05' THEN 1776423.83
    WHEN '2026-06' THEN 1488803.85
  END as diferenca,
  MIN(id_firebird) as id_min,
  MAX(id_firebird) as id_max,
  MAX(id_firebird) - MIN(id_firebird) + 1 as range_esperado,
  (MAX(id_firebird) - MIN(id_firebird) + 1) - COUNT(*) as gaps_possiveis
FROM dash_vendas
WHERE tenant_id = {T}
  AND data_venda >= '2026-04-01'
  AND data_venda <= '2026-06-30'
  {FILTER}
GROUP BY mes
ORDER BY mes;
""", "1. TOTAIS PÓS-SYNC vs ERP (com gaps de ID)")

# ============================================================
# 2. QUANTIDADE TOTAL NO BANCO (todos os status)
# ============================================================
run_db(client, f"""
SELECT 
  TO_CHAR(data_venda, 'YYYY-MM') as mes,
  COUNT(*) as qtd_total,
  COUNT(CASE WHEN UPPER(TRIM(status)) = 'FATURADO' THEN 1 END) as faturado,
  COUNT(CASE WHEN UPPER(TRIM(status)) = 'CANCELADO' THEN 1 END) as cancelado,
  COUNT(CASE WHEN UPPER(TRIM(status)) NOT IN ('FATURADO','CANCELADO','FINALIZADO','PROCESSADO') THEN 1 END) as outros,
  MIN(id_firebird) as id_min,
  MAX(id_firebird) as id_max
FROM dash_vendas
WHERE tenant_id = {T}
  AND data_venda >= '2026-04-01'
  AND data_venda <= '2026-06-30'
GROUP BY mes
ORDER BY mes;
""", "2. TOTAL NO BANCO POR STATUS (verificar se mais registros chegaram)")

# ============================================================
# 3. LOGS DO WORKER DE SINCRONIZAÇÃO
# ============================================================
# Encontrar o container do worker/sync
out = run_sh(client, "docker ps --format '{{.Names}}' | grep -i 'sync\\|worker\\|coliseu'", "3a. Containers de sync/worker")

# Buscar nos containers de middleware os logs de sync recentes
run_sh(client, "docker ps --format '{{.Names}}' | grep -v 'postgres\\|redis\\|nginx\\|coolify\\|identity\\|frontend'", "3b. Todos os containers de aplicação")

# ============================================================
# 4. LOGS DO MIDDLEWARE (que gerencia o sync)
# ============================================================
MW_CONTAINER = 'dashboard-middleware-g115wwb76cltjli9wew0cgfi-192717627336'
run_sh(client, f"docker logs --tail 50 {MW_CONTAINER} 2>&1 | grep -i 'sync\\|sincron\\|worker\\|job\\|error\\|err' | tail -30", "4. LOGS DE SYNC NO MIDDLEWARE (últimos erros/events de sync)")

# ============================================================
# 5. VERIFICAR TODOS OS CONTAINERS COM "SYNC" NOS LOGS RECENTES
# ============================================================
run_sh(client, "for c in $(docker ps --format '{{.Names}}'); do logs=$(docker logs --since 10m $c 2>&1 | grep -i 'sync\\|sincron\\|worker' | head -3); if [ -n \"$logs\" ]; then echo \"=== $c ===\"; echo \"$logs\"; fi; done", "5. CONTAINERS COM ATIVIDADE DE SYNC NOS ÚLTIMOS 10 MIN")

# ============================================================
# 6. VERIFICAR TABELA DE CONTROLE DE SYNC (se existir)
# ============================================================
run_db(client, f"""
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND (table_name LIKE '%sync%' OR table_name LIKE '%job%' OR table_name LIKE '%worker%' OR table_name LIKE '%log%')
ORDER BY table_name;
""", "6. TABELAS DE CONTROLE DE SYNC NO BANCO")

# ============================================================
# 7. ÚLTIMA VENDA SINCRONIZADA (data mais recente no banco)
# ============================================================
run_db(client, f"""
SELECT 
  MAX(id_firebird) as ultimo_id,
  MAX(data_venda) as ultima_data_venda,
  MAX(created_at) as ultimo_insert,
  COUNT(*) as total_vendas
FROM dash_vendas
WHERE tenant_id = {T};
""", "7. ÚLTIMA VENDA NO BANCO (último ID e data de inserção)")

# ============================================================
# 8. CHECAR SE HOUVE INSERÇÃO RECENTE (últimos 30 min)
# ============================================================
run_db(client, f"""
SELECT 
  COUNT(*) as inseridos_recentes,
  MIN(id_firebird) as id_min,
  MAX(id_firebird) as id_max,
  MIN(data_venda) as data_venda_min,
  MAX(data_venda) as data_venda_max
FROM dash_vendas
WHERE tenant_id = {T}
  AND created_at >= NOW() - INTERVAL '30 minutes';
""", "8. INSERÇÕES NOS ÚLTIMOS 30 MIN (verificar se sync rodou)")

# ============================================================
# 9. DIFERENÇAS RESIDUAIS - QUAIS DIAS AINDA DIVERGEM
# ============================================================
run_db(client, f"""
SELECT 
  TO_CHAR(data_venda, 'YYYY-MM-DD') as dia,
  COUNT(*) as qtd,
  SUM(valor_total - COALESCE(valor_desconto, 0)) as total_dash
FROM dash_vendas
WHERE tenant_id = {T}
  AND data_venda >= '2026-04-01'
  AND data_venda <= '2026-06-30'
  {FILTER}
GROUP BY dia
ORDER BY dia;
""", "9. FATURAMENTO DIA A DIA COMPLETO (ABR-JUN 2026)")

client.close()
print("\n" + "="*60)
print("RELATÓRIO CONCLUÍDO")
print("="*60)

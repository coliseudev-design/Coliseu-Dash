"""
ANÁLISE DE DEDUPLICAÇÃO COMPLETA
Confirmado: ERP tem 11 PIX-TRANSFERÊNCIA negativas, DB tem 22 (duplicadas)
Verificar se há mais duplicatas em outras espécies e calcular o total correto.
"""
import paramiko

HOST = '2.24.82.19'
USER = 'root'
PASS = 'Col@13894645'
CONTAINER = 'vasjsucz4yxcb7m4rtqindd2'
T = "'2395efd5-6476-4f3c-a7b8-f31d5567b42f'"
FILTER_STATUS = "AND UPPER(TRIM(status)) IN ('FATURADO','FINALIZADO','PROCESSADO')"
FILTER_GARANTIA = "AND (UPPER(TRIM(COALESCE(especie,''))) != 'GARANTIA' OR (COALESCE(valor_total,0)-COALESCE(valor_desconto,0))>=0)"

def run(client, sql, desc=""):
    cmd = f"docker exec {CONTAINER} psql -U coliseu_admin -d coliseu_dashboard -c \"{sql}\""
    _, stdout, _ = client.exec_command(cmd)
    out = stdout.read().decode('utf-8')
    if desc:
        print(f"\n{'='*60}\n=== {desc} ===\n{'='*60}")
    print(out)
    return out

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PASS, timeout=20)

# ========================================================
# 1. Contar duplicatas por grupo (mesmo cliente+valor+data+espécie+negativo)
# ========================================================
run(client, f"""
SELECT 
  TO_CHAR(data_venda, 'YYYY-MM') as mes,
  UPPER(TRIM(COALESCE(especie,'NULL'))) as especie_,
  cliente_id_firebird,
  (valor_total - COALESCE(valor_desconto,0)) as liquido,
  COUNT(*) as vezes,
  array_agg(id_firebird ORDER BY id_firebird) as ids,
  array_agg(processo ORDER BY id_firebird) as processos,
  array_agg(es ORDER BY id_firebird) as es_vals
FROM dash_vendas
WHERE tenant_id = {T}
  AND data_venda >= '2026-04-01'
  AND data_venda <= '2026-06-30'
  {FILTER_STATUS}
  AND (valor_total - COALESCE(valor_desconto,0)) < 0
  AND UPPER(TRIM(COALESCE(especie,''))) != 'GARANTIA'
GROUP BY mes, especie_, cliente_id_firebird, liquido
HAVING COUNT(*) > 1
ORDER BY mes, COUNT(*) DESC, liquido ASC;
""", "1. TODOS OS GRUPOS DUPLICADOS (mesmo cliente+valor+data+espécie, negativos)")

# ========================================================
# 2. TOTAL DEDUPLICADO: contar cada grupo negativo APENAS 1x
#    Usar MIN(id_firebird) para manter apenas 1 por grupo
# ========================================================
run(client, f"""
WITH dedup AS (
  SELECT DISTINCT ON (tenant_id, cliente_id_firebird, (valor_total - COALESCE(valor_desconto,0))::numeric, data_venda::date, especie)
    id_firebird,
    data_venda,
    valor_total,
    valor_desconto,
    especie,
    processo,
    es
  FROM dash_vendas
  WHERE tenant_id = {T}
    AND data_venda >= '2026-04-01'
    AND data_venda <= '2026-06-30'
    {FILTER_STATUS}
    AND UPPER(TRIM(COALESCE(especie,''))) != 'GARANTIA'
    AND (valor_total - COALESCE(valor_desconto,0)) < 0
  ORDER BY tenant_id, cliente_id_firebird, (valor_total - COALESCE(valor_desconto,0))::numeric, data_venda::date, especie, id_firebird DESC
),
positivas AS (
  SELECT 
    TO_CHAR(data_venda, 'YYYY-MM') as mes,
    SUM(valor_total - COALESCE(valor_desconto,0)) as total_pos
  FROM dash_vendas
  WHERE tenant_id = {T}
    AND data_venda >= '2026-04-01'
    AND data_venda <= '2026-06-30'
    {FILTER_STATUS}
    AND UPPER(TRIM(COALESCE(especie,''))) != 'GARANTIA'
    AND (valor_total - COALESCE(valor_desconto,0)) >= 0
  GROUP BY mes
),
dedup_neg AS (
  SELECT 
    TO_CHAR(data_venda, 'YYYY-MM') as mes,
    SUM(valor_total - COALESCE(valor_desconto,0)) as total_neg_dedup
  FROM dedup
  GROUP BY mes
)
SELECT 
  p.mes,
  p.total_pos as positivas,
  COALESCE(d.total_neg_dedup, 0) as negativas_dedup,
  p.total_pos + COALESCE(d.total_neg_dedup, 0) as total_deduplicado,
  CASE p.mes
    WHEN '2026-04' THEN 608819.01
    WHEN '2026-05' THEN 1776423.83
    WHEN '2026-06' THEN 1488803.85
  END as erp_referencia,
  p.total_pos + COALESCE(d.total_neg_dedup, 0) - CASE p.mes
    WHEN '2026-04' THEN 608819.01
    WHEN '2026-05' THEN 1776423.83
    WHEN '2026-06' THEN 1488803.85
  END as diferenca_vs_erp
FROM positivas p
LEFT JOIN dedup_neg d ON d.mes = p.mes
ORDER BY p.mes;
""", "2. TOTAL DEDUPLICADO vs ERP (cada negativo contado só 1x por cliente+valor+dia)")

# ========================================================
# 3. Listar os IDs a DELETAR (os duplicados a remover)
# ========================================================
run(client, f"""
WITH grupos AS (
  SELECT 
    cliente_id_firebird,
    (valor_total - COALESCE(valor_desconto,0))::numeric as liquido,
    data_venda::date as dia,
    especie,
    COUNT(*) as cnt,
    MAX(id_firebird) as keep_id,
    array_agg(id_firebird ORDER BY id_firebird) as all_ids
  FROM dash_vendas
  WHERE tenant_id = {T}
    AND data_venda >= '2026-04-01'
    AND data_venda <= '2026-06-30'
    {FILTER_STATUS}
    AND (valor_total - COALESCE(valor_desconto,0)) < 0
    AND UPPER(TRIM(COALESCE(especie,''))) != 'GARANTIA'
  GROUP BY cliente_id_firebird, liquido, dia, especie
  HAVING COUNT(*) > 1
)
SELECT 
  TO_CHAR(dia, 'YYYY-MM') as mes,
  especie,
  dia,
  liquido,
  all_ids,
  keep_id as manter_id,
  all_ids[1] as deletar_id
FROM grupos
ORDER BY mes, especie, liquido;
""", "3. IDs A DELETAR (manter o MAX id_firebird, deletar o MIN)")

# ========================================================
# 4. Soma dos IDs que serão deletados
# ========================================================
run(client, f"""
WITH grupos AS (
  SELECT 
    cliente_id_firebird,
    (valor_total - COALESCE(valor_desconto,0))::numeric as liquido,
    data_venda::date as dia,
    especie,
    MIN(id_firebird) as delete_id
  FROM dash_vendas
  WHERE tenant_id = {T}
    AND data_venda >= '2026-04-01'
    AND data_venda <= '2026-06-30'
    {FILTER_STATUS}
    AND (valor_total - COALESCE(valor_desconto,0)) < 0
    AND UPPER(TRIM(COALESCE(especie,''))) != 'GARANTIA'
  GROUP BY cliente_id_firebird, liquido, dia, especie
  HAVING COUNT(*) > 1
),
to_delete AS (
  SELECT v.*
  FROM dash_vendas v
  JOIN grupos g ON v.id_firebird = g.delete_id AND v.tenant_id = {T}
)
SELECT 
  TO_CHAR(data_venda, 'YYYY-MM') as mes,
  UPPER(TRIM(COALESCE(especie,'NULL'))) as especie_,
  COUNT(*) as qtd_deletar,
  SUM(valor_total - COALESCE(valor_desconto,0)) as impacto
FROM to_delete
GROUP BY mes, especie_
ORDER BY mes, especie_;
""", "4. IMPACTO POR MÊS E ESPÉCIE: quantas linhas deletar e qual impacto")

client.close()
print("\n=== ANÁLISE CONCLUÍDA ===")

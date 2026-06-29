"""
ANÁLISE FINAL: As PIX-TRANSFERÊNCIA negativos de Maio são DUPLICATAS DE SINCRONIZAÇÃO?
Verificar se cada ID representa uma nota fiscal diferente ou são o mesmo documento duplicado.
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

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PASS, timeout=20)

# ========================================================
# 1. Ver os detalhes completos dos pares duplicados
# ========================================================
run(client, f"""
SELECT 
  id_firebird, numero_pedido, cliente_id_firebird,
  TO_CHAR(data_venda,'DD/MM/YYYY HH24:MI') as data,
  especie, valor_total, valor_desconto,
  (valor_total - COALESCE(valor_desconto,0)) as liquido,
  processo, es, status
FROM dash_vendas
WHERE tenant_id = {T}
  AND id_firebird IN (16323,16360, 16175,16196, 16317,16322, 16263,16274)
ORDER BY (valor_total - COALESCE(valor_desconto,0)) ASC, id_firebird ASC;
""", "1. PARES DUPLICADOS: ver numero_pedido, cliente, processo")

# ========================================================
# 2. Verificar se os pares têm numero_pedido diferente (ou mesmo)
# ========================================================
run(client, f"""
SELECT 
  numero_pedido,
  COUNT(*) as vezes,
  array_agg(id_firebird ORDER BY id_firebird) as ids,
  SUM(valor_total - COALESCE(valor_desconto,0)) as total
FROM dash_vendas
WHERE tenant_id = {T}
  AND data_venda >= '2026-05-25'
  AND data_venda <= '2026-05-26 23:59:59'
  AND (valor_total - COALESCE(valor_desconto,0)) < 0
  AND UPPER(TRIM(COALESCE(especie,''))) = 'PIX - TRANSFERÊNCIA'
  AND UPPER(TRIM(status)) IN ('FATURADO','FINALIZADO','PROCESSADO')
GROUP BY numero_pedido
ORDER BY total ASC;
""", "2. AGRUPADO POR numero_pedido - são o mesmo pedido duplicado?")

# ========================================================
# 3. Verificar se IDs consecutivos com o mesmo valor têm numero_pedido diferente  
# ========================================================
run(client, f"""
SELECT 
  a.id_firebird as id_a, b.id_firebird as id_b,
  a.numero_pedido as pedido_a, b.numero_pedido as pedido_b,
  a.cliente_id_firebird as cliente_a, b.cliente_id_firebird as cliente_b,
  (a.valor_total - COALESCE(a.valor_desconto,0)) as liquido_a,
  (b.valor_total - COALESCE(b.valor_desconto,0)) as liquido_b
FROM dash_vendas a
JOIN dash_vendas b ON a.tenant_id = b.tenant_id 
  AND (a.valor_total - COALESCE(a.valor_desconto,0)) = (b.valor_total - COALESCE(b.valor_desconto,0))
  AND a.id_firebird < b.id_firebird
  AND ABS(a.id_firebird - b.id_firebird) < 100
WHERE a.tenant_id = {T}
  AND a.data_venda >= '2026-05-25'
  AND a.data_venda <= '2026-05-26 23:59:59'
  AND (a.valor_total - COALESCE(a.valor_desconto,0)) < 0
  AND UPPER(TRIM(COALESCE(a.especie,''))) = 'PIX - TRANSFERÊNCIA'
  AND UPPER(TRIM(a.status)) IN ('FATURADO','FINALIZADO','PROCESSADO')
ORDER BY a.id_firebird;
""", "3. PARES: verificar se são clientes/pedidos diferentes ou o mesmo")

# ========================================================
# 4. CALCULAR O IMPACTO se removermos APENAS as duplicatas dos pares negativos
#    Hipótese: cada par tem 2 entradas mas deveria ter apenas 1
# ========================================================
run(client, f"""
-- Se as PIX negativas em pares forem duplicatas do sincronizador (1 deveria existir, 2 existem)
-- O impacto de tirar a duplicata seria: -38470.30 / 2 = +19235.15 a mais no Maio
SELECT 
  TO_CHAR(data_venda, 'YYYY-MM') as mes,
  SUM(valor_total - COALESCE(valor_desconto,0)) as total_atual,
  -- Se PIX-TRANSFERÊNCIA negativo aparece 2x, considerar apenas 1x
  SUM(valor_total - COALESCE(valor_desconto,0)) - (-38470.30 / 2) as ajuste_pix_maio,
  1776423.83 as erp_maio
FROM dash_vendas
WHERE tenant_id = {T}
  AND data_venda >= '2026-05-01'
  AND data_venda <= '2026-05-31'
  AND UPPER(TRIM(status)) IN ('FATURADO','FINALIZADO','PROCESSADO')
  AND (UPPER(TRIM(COALESCE(especie,''))) != 'GARANTIA' OR (COALESCE(valor_total,0)-COALESCE(valor_desconto,0))>=0)
GROUP BY mes;
""", "4. SIMULAÇÃO: se PIX duplicatas removidas, Maio bate com ERP?")

client.close()
print("\n=== CONCLUÍDO ===")

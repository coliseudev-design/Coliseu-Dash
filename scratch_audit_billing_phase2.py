"""
AUDITORIA FASE 2: Analisar devoluções como vendas negativas e seu impacto por mês
"""
import paramiko

HOST = '2.24.82.19'
USER = 'root'
PASS = 'Col@13894645'
CONTAINER = 'vasjsucz4yxcb7m4rtqindd2'
TENANT = '2395efd5-6476-4f3c-a7b8-f31d5567b42f'

def run(client, sql, desc=""):
    cmd = f"docker exec {CONTAINER} psql -U coliseu_admin -d coliseu_dashboard -c \"{sql}\""
    _, stdout, _ = client.exec_command(cmd)
    out = stdout.read().decode('utf-8')
    if desc:
        print(f"\n{'='*60}")
        print(f"=== {desc} ===")
        print('='*60)
    print(out)
    return out

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PASS, timeout=20)
T = f"'{TENANT}'"

# ========================
# 1. Devolucoes como vendas negativas por mês
# ========================
run(client, f"""
SELECT 
  TO_CHAR(COALESCE(data_vencimento, data_venda), 'YYYY-MM') as mes,
  COUNT(*) as qtd,
  SUM(valor_total - COALESCE(valor_desconto, 0)) as total_negativo
FROM dash_vendas
WHERE tenant_id = {T}
  AND COALESCE(data_vencimento, data_venda) >= '2026-04-01'
  AND COALESCE(data_vencimento, data_venda) <= '2026-06-30'
  AND UPPER(TRIM(status)) IN ('FATURADO', 'FINALIZADO', 'PROCESSADO')
  AND UPPER(TRIM(COALESCE(especie, ''))) = 'DEVOLUCAO DE CLIENTE'
GROUP BY mes
ORDER BY mes;
""", "1. DEVOLUÇÕES como vendas negativas (espécie=DEVOLUCAO DE CLIENTE) por mês")

# ========================
# 2. Qual seria o total SEM as devoluções de cliente (pure vendas)
# ========================
run(client, f"""
SELECT 
  TO_CHAR(COALESCE(data_vencimento, data_venda), 'YYYY-MM') as mes,
  COUNT(*) as qtd_vendas_puras,
  SUM(valor_total - COALESCE(valor_desconto, 0)) as faturamento_sem_devolucao_cliente
FROM dash_vendas
WHERE tenant_id = {T}
  AND COALESCE(data_vencimento, data_venda) >= '2026-04-01'
  AND COALESCE(data_vencimento, data_venda) <= '2026-06-30'
  AND UPPER(TRIM(status)) IN ('FATURADO', 'FINALIZADO', 'PROCESSADO')
  AND UPPER(TRIM(COALESCE(especie, ''))) NOT IN ('GARANTIA', 'DEVOLUCAO DE CLIENTE')
GROUP BY mes
ORDER BY mes;
""", "2. FATURAMENTO SEM DEVOLUÇÕES DE CLIENTE por mês")

# ========================
# 3. Total com devolução incluída (situação atual do Dashboard) vs sem
# ========================
run(client, f"""
SELECT 
  TO_CHAR(COALESCE(data_vencimento, data_venda), 'YYYY-MM') as mes,
  SUM(CASE WHEN UPPER(TRIM(COALESCE(especie, ''))) NOT IN ('GARANTIA', 'DEVOLUCAO DE CLIENTE') 
      THEN valor_total - COALESCE(valor_desconto, 0) ELSE 0 END) as sem_devolucao_cliente,
  SUM(CASE WHEN UPPER(TRIM(COALESCE(especie, ''))) != 'GARANTIA' OR (COALESCE(valor_total, 0) - COALESCE(valor_desconto, 0)) >= 0 
      THEN valor_total - COALESCE(valor_desconto, 0) ELSE 0 END) as atual_dashboard,
  SUM(CASE WHEN UPPER(TRIM(COALESCE(especie, ''))) = 'DEVOLUCAO DE CLIENTE' THEN valor_total - COALESCE(valor_desconto, 0) ELSE 0 END) as devol_cliente_total
FROM dash_vendas
WHERE tenant_id = {T}
  AND COALESCE(data_vencimento, data_venda) >= '2026-04-01'
  AND COALESCE(data_vencimento, data_venda) <= '2026-06-30'
  AND UPPER(TRIM(status)) IN ('FATURADO', 'FINALIZADO', 'PROCESSADO')
GROUP BY mes ORDER BY mes;
""", "3. COMPARATIVO: Dashboard atual vs sem DEVOLUCAO DE CLIENTE")

# ========================
# 4. Dia a dia junho com e sem DEVOLUCAO DE CLIENTE
# ========================
run(client, f"""
SELECT 
  TO_CHAR(COALESCE(data_vencimento, data_venda), 'YYYY-MM-DD') as dia,
  SUM(CASE WHEN UPPER(TRIM(COALESCE(especie, ''))) NOT IN ('GARANTIA', 'DEVOLUCAO DE CLIENTE')
      THEN valor_total - COALESCE(valor_desconto, 0) ELSE 0 END) as faturamento_puro,
  SUM(CASE WHEN UPPER(TRIM(COALESCE(especie, ''))) = 'DEVOLUCAO DE CLIENTE'
      THEN valor_total - COALESCE(valor_desconto, 0) ELSE 0 END) as devolucoes_cliente,
  SUM(CASE WHEN UPPER(TRIM(COALESCE(especie, ''))) != 'GARANTIA' OR (COALESCE(valor_total, 0) - COALESCE(valor_desconto, 0)) >= 0
      THEN valor_total - COALESCE(valor_desconto, 0) ELSE 0 END) as total_atual_dashboard
FROM dash_vendas
WHERE tenant_id = {T}
  AND COALESCE(data_vencimento, data_venda) >= '2026-06-01'
  AND COALESCE(data_vencimento, data_venda) <= '2026-06-30'
  AND UPPER(TRIM(status)) IN ('FATURADO', 'FINALIZADO', 'PROCESSADO')
GROUP BY dia ORDER BY dia;
""", "4. JUNHO 2026 - Dia a dia: vendas puras vs devoluções de cliente")

# ========================
# 5. Verificar se o ERP inclui as DEVOLUCAO DE CLIENTE no faturamento
#    → Verificar as 10 maiores vendas negativas DEVOLUCAO DE CLIENTE
# ========================
run(client, f"""
SELECT 
  id_firebird,
  TO_CHAR(COALESCE(data_vencimento, data_venda), 'YYYY-MM-DD') as data,
  especie,
  status,
  valor_total,
  valor_desconto,
  (valor_total - COALESCE(valor_desconto, 0)) as liquido
FROM dash_vendas
WHERE tenant_id = {T}
  AND COALESCE(data_vencimento, data_venda) >= '2026-04-01'
  AND COALESCE(data_vencimento, data_venda) <= '2026-06-30'
  AND UPPER(TRIM(COALESCE(especie, ''))) = 'DEVOLUCAO DE CLIENTE'
  AND UPPER(TRIM(status)) IN ('FATURADO', 'FINALIZADO', 'PROCESSADO')
ORDER BY liquido ASC
LIMIT 20;
""", "5. TOP 20 DEVOLUCOES DE CLIENTE (mais negativas)")

# ========================
# 6. Verificar se a tabela dash_devolucoes está vazia para este tenant
# ========================
run(client, f"""
SELECT COUNT(*), MIN(data_devolucao), MAX(data_devolucao)
FROM dash_devolucoes
WHERE tenant_id = {T};
""", "6. TABELA dash_devolucoes - total de registros")

client.close()
print("\n=== FASE 2 CONCLUÍDA ===")

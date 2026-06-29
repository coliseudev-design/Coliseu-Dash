"""
ANÁLISE FINAL: Confirmar duplicatas e calcular impacto exato
Baseado em: IDs duplicados em pares para as PIX-TRANSFERÊNCIA negativas
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
# 1. Confirmar se os IDs que parecem duplicados TÊM O MESMO VALOR
# ========================================================
run(client, f"""
SELECT 
  (valor_total - COALESCE(valor_desconto,0)) as liquido,
  COUNT(*) as vezes,
  array_agg(id_firebird ORDER BY id_firebird) as ids
FROM dash_vendas
WHERE tenant_id = {T}
  AND data_venda >= '2026-05-25'
  AND data_venda <= '2026-05-27'
  AND (valor_total - COALESCE(valor_desconto,0)) < 0
  AND UPPER(TRIM(COALESCE(especie,''))) = 'PIX - TRANSFERÊNCIA'
  AND UPPER(TRIM(status)) IN ('FATURADO','FINALIZADO','PROCESSADO')
GROUP BY liquido
ORDER BY liquido ASC;
""", "1. PIX TRANSFERÊNCIA NEGATIVOS DE 25-26/05 - verificar se são duplicatas")

# ========================================================
# 2. O ERP descontaria DEVOLUCAO DE CLIENTE mas não esses PIX negativos?
#    Calcular total EXATO que o ERP deve mostrar segundo nossa hipótese:
#    ERP = positivas - DEVOLUCAO DE CLIENTE
# ========================================================
run(client, f"""
SELECT 
  TO_CHAR(data_venda, 'YYYY-MM') as mes,
  SUM(CASE WHEN (valor_total - COALESCE(valor_desconto,0)) > 0 
      THEN valor_total - COALESCE(valor_desconto,0) ELSE 0 END) as positivas,
  SUM(CASE WHEN UPPER(TRIM(COALESCE(especie,''))) = 'DEVOLUCAO DE CLIENTE' 
      THEN valor_total - COALESCE(valor_desconto,0) ELSE 0 END) as devolucao_cliente,
  SUM(CASE WHEN (valor_total - COALESCE(valor_desconto,0)) > 0 
      THEN valor_total - COALESCE(valor_desconto,0) ELSE 0 END)
  + SUM(CASE WHEN UPPER(TRIM(COALESCE(especie,''))) = 'DEVOLUCAO DE CLIENTE' 
      THEN valor_total - COALESCE(valor_desconto,0) ELSE 0 END) as hipotese_erp
FROM dash_vendas
WHERE tenant_id = {T}
  AND data_venda >= '2026-04-01'
  AND data_venda <= '2026-06-30'
  AND UPPER(TRIM(status)) IN ('FATURADO','FINALIZADO','PROCESSADO')
  AND UPPER(TRIM(COALESCE(especie,''))) != 'GARANTIA'
GROUP BY mes ORDER BY mes;
""", "2. HIPÓTESE ERP: positivas - DEVOLUCAO DE CLIENTE (sem outros negativos)")

# ========================================================
# 3. Verificar quais OUTRAS espécies negativas o ERP desconta ou não
#    Calculando os cenários possíveis para bater exatamente
# ========================================================
run(client, f"""
SELECT 
  TO_CHAR(data_venda, 'YYYY-MM') as mes,
  SUM(valor_total - COALESCE(valor_desconto,0)) as total_atual_dash,
  -- Cenario A: Exclui TODOS os negativos (exceto DEVOLUCAO DE CLIENTE que fica)
  SUM(CASE WHEN (valor_total - COALESCE(valor_desconto,0)) >= 0 
          OR UPPER(TRIM(COALESCE(especie,''))) = 'DEVOLUCAO DE CLIENTE'
      THEN valor_total - COALESCE(valor_desconto,0) ELSE 0 END) as cenario_A,
  -- Cenario B: Inclui apenas DEVOLUCAO DE CLIENTE negativo, exclui resto
  SUM(CASE WHEN UPPER(TRIM(COALESCE(especie,''))) NOT IN ('GARANTIA','MECANICO')
          AND (
            (valor_total - COALESCE(valor_desconto,0)) >= 0
            OR UPPER(TRIM(COALESCE(especie,''))) = 'DEVOLUCAO DE CLIENTE'
          )
      THEN valor_total - COALESCE(valor_desconto,0) ELSE 0 END) as cenario_B
FROM dash_vendas
WHERE tenant_id = {T}
  AND data_venda >= '2026-04-01'
  AND data_venda <= '2026-06-30'
  AND UPPER(TRIM(status)) IN ('FATURADO','FINALIZADO','PROCESSADO')
GROUP BY mes ORDER BY mes;
""", "3. CENÁRIOS: A=positivas+DEVOLUCAO_CLIENTE  B=sem GARANTIA/MECANICO negativos")

# ========================================================
# 4. Verificar exatamente os valores negativos de MECANICO, PIX, BOLETO, DUPLICATA
#    por espécie e mês
# ========================================================
run(client, f"""
SELECT 
  TO_CHAR(data_venda, 'YYYY-MM') as mes,
  UPPER(TRIM(COALESCE(especie,'NULL'))) as especie_,
  COUNT(*) as qtd,
  SUM(valor_total - COALESCE(valor_desconto,0)) as total
FROM dash_vendas
WHERE tenant_id = {T}
  AND data_venda >= '2026-04-01'
  AND data_venda <= '2026-06-30'
  AND UPPER(TRIM(status)) IN ('FATURADO','FINALIZADO','PROCESSADO')
  AND (valor_total - COALESCE(valor_desconto,0)) < 0
  AND UPPER(TRIM(COALESCE(especie,''))) NOT IN ('GARANTIA','DEVOLUCAO DE CLIENTE')
GROUP BY mes, especie_
ORDER BY mes, total ASC;
""", "4. NEGATIVOS SEM GARANTIA E SEM DEVOLUCAO DE CLIENTE (por espécie e mês)")

client.close()
print("\n=== CONCLUÍDO ===")

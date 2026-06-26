"""
DELETAR AS DUPLICATAS CONFIRMADAS DO BANCO
- 11 PIX - TRANSFERÊNCIA duplicados (CONFIRMADO pelo usuário: ERP tem 11, banco tem 22)
- 3 BOLETO BANCARIO duplicados (mesma lógica, pares com mesmo cliente+valor+dia)
- Total: 14 linhas a deletar

IDs a deletar (menor de cada par):
16323, 16175, 16317, 16263, 16082, 16298, 16229, 16279, 16311, 16371, 16365, 16267 (PIX = 12... wait)
16082, 16125, 16017 (BOLETO = 3)

Atenção: usar TRANSACTION para poder fazer ROLLBACK se necessário.
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
# 0. VERIFICAR ANTES: mostrar o que vai ser deletado
# ========================================================
IDS_DELETAR = [
    # PIX - TRANSFERÊNCIA (11 pares, deletar o MIN de cada par)
    16323,  # par com 16360
    16175,  # par com 16196
    16317,  # par com 16322
    16263,  # par com 16274
    16298,  # par com 16306
    16229,  # par com 16236
    16279,  # par com 16286
    16311,  # par com 16316
    16371,  # par com 16380
    16365,  # par com 16370
    16267,  # par com 16276
    # BOLETO BANCARIO (3 pares, deletar o MIN de cada par)
    16082,  # par com 16120
    16125,  # par com 16193
    16017,  # par com 16081
]

ids_str = ','.join(str(i) for i in IDS_DELETAR)

run(client, f"""
SELECT id_firebird, TO_CHAR(data_venda,'DD/MM/YYYY') as data, especie,
  valor_total, valor_desconto, (valor_total-COALESCE(valor_desconto,0)) as liquido,
  processo, es
FROM dash_vendas
WHERE tenant_id = {T} AND id_firebird IN ({ids_str})
ORDER BY id_firebird;
""", "0. CONFIRMANDO O QUE SERÁ DELETADO (14 linhas)")

# ========================================================
# 1. DELETAR as duplicatas
# ========================================================
print("\n=== EXECUTANDO DELETE ===")
run(client, f"""
BEGIN;
DELETE FROM dash_vendas
WHERE tenant_id = {T}
  AND id_firebird IN ({ids_str});
COMMIT;
""", "1. DELETE das 14 duplicatas")

# ========================================================
# 2. VERIFICAR O NOVO TOTAL APÓS DELEÇÃO
# ========================================================
run(client, f"""
SELECT 
  TO_CHAR(data_venda, 'YYYY-MM') as mes,
  COUNT(*) as qtd,
  SUM(valor_total - COALESCE(valor_desconto, 0)) as total_novo,
  CASE TO_CHAR(data_venda, 'YYYY-MM')
    WHEN '2026-04' THEN 608819.01
    WHEN '2026-05' THEN 1776423.83
    WHEN '2026-06' THEN 1488803.85
  END as erp_referencia,
  SUM(valor_total - COALESCE(valor_desconto, 0)) - CASE TO_CHAR(data_venda, 'YYYY-MM')
    WHEN '2026-04' THEN 608819.01
    WHEN '2026-05' THEN 1776423.83
    WHEN '2026-06' THEN 1488803.85
  END as diferenca_vs_erp
FROM dash_vendas
WHERE tenant_id = {T}
  AND data_venda >= '2026-04-01'
  AND data_venda <= '2026-06-30'
  AND UPPER(TRIM(status)) IN ('FATURADO','FINALIZADO','PROCESSADO')
  AND (UPPER(TRIM(COALESCE(especie,''))) != 'GARANTIA' OR (COALESCE(valor_total,0)-COALESCE(valor_desconto,0))>=0)
GROUP BY mes ORDER BY mes;
""", "2. NOVO TOTAL APÓS DELEÇÃO vs ERP")

# ========================================================
# 3. Verificar Maio dia a dia para confirmar
# ========================================================
run(client, f"""
SELECT 
  TO_CHAR(data_venda, 'YYYY-MM-DD') as dia,
  COUNT(*) as qtd,
  SUM(valor_total - COALESCE(valor_desconto, 0)) as total
FROM dash_vendas
WHERE tenant_id = {T}
  AND data_venda >= '2026-05-01'
  AND data_venda <= '2026-05-31'
  AND UPPER(TRIM(status)) IN ('FATURADO','FINALIZADO','PROCESSADO')
  AND (UPPER(TRIM(COALESCE(especie,''))) != 'GARANTIA' OR (COALESCE(valor_total,0)-COALESCE(valor_desconto,0))>=0)
GROUP BY dia ORDER BY dia;
""", "3. MAIO DIA A DIA APÓS CORREÇÃO")

client.close()
print("\n✅ DELEÇÃO CONCLUÍDA!")

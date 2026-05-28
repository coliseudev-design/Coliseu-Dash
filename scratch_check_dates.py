import paramiko

HOST = '177.39.17.7'
USER = 'root'
PASS = '6EFBC!c0:wzr%Ij'
CONTAINER = 'coliseu-db-thyqkc5gkvp7i1nld555wakz-172547374937'

def run_query(label, sql):
    sql_escaped = sql.replace('"', '\\"')
    cmd = f'docker exec {CONTAINER} psql -U coliseu_admin -d coliseu_dashboard -c "{sql_escaped}"'
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        client.connect(HOST, username=USER, password=PASS)
        _, stdout, stderr = client.exec_command(cmd)
        out = stdout.read().decode('utf-8')
        err = stderr.read().decode('utf-8')
        print(f"\n=== {label} ===")
        print(out or "(sem resultado)")
        if err.strip():
            print("ERR:", err)
    except Exception as e:
        print(f"[ERRO] {label}: {e}")
    finally:
        client.close()

TENANT_VETSEED = 'a822a7e7-fdd4-4483-bbb5-26587a72739f'

# Verificar data_venda vs data_vencimento para VetSeed
run_query(
    "VETSEED - data_venda vs data_vencimento",
    f"""SELECT 
         TO_CHAR(data_venda, 'YYYY-MM') as mes_venda,
         TO_CHAR(data_vencimento, 'YYYY-MM') as mes_vencimento,
         COUNT(*) as qtd
       FROM dash_vendas
       WHERE tenant_id = '{TENANT_VETSEED}'
         AND data_venda >= '2025-10-01'
         AND TRIM(status) IN ('FATURADO', 'FINALIZADO')
       GROUP BY TO_CHAR(data_venda, 'YYYY-MM'), TO_CHAR(data_vencimento, 'YYYY-MM')
       ORDER BY mes_venda DESC, mes_vencimento"""
)

# Verificar quantas vendas tem data_vencimento diferente de data_venda
run_query(
    "VETSEED - Pedidos com data_venda != data_vencimento em Dez 2025",
    f"""SELECT COUNT(*) as diferentes,
         MIN(data_venda) as min_data_venda,
         MAX(data_venda) as max_data_venda,
         MIN(data_vencimento) as min_vencimento,
         MAX(data_vencimento) as max_vencimento
       FROM dash_vendas
       WHERE tenant_id = '{TENANT_VETSEED}'
         AND data_venda >= '2025-12-01' AND data_venda < '2026-01-01'
         AND data_vencimento IS NOT NULL
         AND DATE_TRUNC('month', data_venda) != DATE_TRUNC('month', data_vencimento)"""
)

# Verificar amostras de 5 registros em Dez 2025 com data_vencimento
run_query(
    "VETSEED - Amostra 5 registros Dez 2025",
    f"""SELECT id_firebird, numero_pedido, 
         TO_CHAR(data_venda, 'DD/MM/YYYY HH24:MI') as data_venda,
         TO_CHAR(data_vencimento, 'DD/MM/YYYY HH24:MI') as data_vencimento,
         valor_total, TRIM(status) as status
       FROM dash_vendas
       WHERE tenant_id = '{TENANT_VETSEED}'
         AND data_venda >= '2025-12-01' AND data_venda < '2026-01-01'
       ORDER BY data_venda DESC
       LIMIT 5"""
)

# Verificar sincronizacao - ultima sincronizacao por tabela para VetSeed
run_query(
    "VETSEED - Status de Sincronizacao",
    f"""SELECT tabela, ultima_sincronizacao, registros_sincronizados, status, erro_mensagem
       FROM dash_sync_metadata
       WHERE tenant_id = '{TENANT_VETSEED}'
       ORDER BY ultima_sincronizacao DESC"""
)

# Quantas vendas totais existem para VetSeed (sem filtro de data)
run_query(
    "VETSEED - Total geral de vendas no banco",
    f"""SELECT TRIM(status) as status, COUNT(*) as qtd, ROUND(SUM(valor_total)::numeric, 2) as total
       FROM dash_vendas
       WHERE tenant_id = '{TENANT_VETSEED}'
       GROUP BY TRIM(status)
       ORDER BY total DESC"""
)

# Comparar com a logica do overview - usando data_venda para Dez 2025
run_query(
    "OVERVIEW DEZ 2025 - como o dashboard calcula (sem devolucoes)",
    f"""SELECT 
         COUNT(DISTINCT id_firebird) as qtd_pedidos,
         ROUND(SUM(valor_total)::numeric, 2) as faturamento_bruto,
         ROUND(AVG(valor_total)::numeric, 2) as ticket_medio
       FROM dash_vendas
       WHERE tenant_id = '{TENANT_VETSEED}'
         AND data_venda >= '2025-12-01'
         AND data_venda < '2026-01-01'
         AND TRIM(status) IN ('FATURADO', 'FINALIZADO')"""
)

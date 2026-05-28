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

# Verificar tenants distintos
run_query("TENANTS", "SELECT DISTINCT tenant_id FROM dash_vendas LIMIT 5")

# Vendas de Dez/2025 por status e tenant - contagem e soma
run_query(
    "VENDAS DEZ 2025 - STATUS x TENANT",
    """SELECT tenant_id, TRIM(status) as status, COUNT(*) as qtd, ROUND(SUM(valor_total)::numeric, 2) as total
       FROM dash_vendas
       WHERE data_venda >= '2025-12-01' AND data_venda < '2026-01-01'
       GROUP BY tenant_id, TRIM(status)
       ORDER BY tenant_id, total DESC"""
)

# Somente FATURADO + FINALIZADO (regra do dashboard)
run_query(
    "VENDAS DEZ 2025 - FATURADO+FINALIZADO por tenant",
    """SELECT tenant_id, COUNT(DISTINCT id_firebird) as qtd_pedidos, ROUND(SUM(valor_total)::numeric, 2) as faturamento_bruto
       FROM dash_vendas
       WHERE data_venda >= '2025-12-01' AND data_venda < '2026-01-01'
         AND TRIM(status) IN ('FATURADO', 'FINALIZADO')
       GROUP BY tenant_id"""
)

# Devolucoes de Dez/2025 por tenant
run_query(
    "DEVOLUCOES DEZ 2025 por tenant",
    """SELECT tenant_id, COUNT(*) as qtd, ROUND(SUM(valor)::numeric, 2) as total_devolucoes
       FROM dash_devolucoes
       WHERE data_devolucao >= '2025-12-01' AND data_devolucao < '2026-01-01'
       GROUP BY tenant_id"""
)

# Calcular faturamento liquido = bruto - devolucoes e ticket medio
run_query(
    "FATURAMENTO LIQUIDO + TICKET MEDIO DEZ 2025",
    """WITH vendas AS (
         SELECT tenant_id,
                COUNT(DISTINCT id_firebird) as qtd_pedidos,
                SUM(valor_total) as bruto
         FROM dash_vendas
         WHERE data_venda >= '2025-12-01' AND data_venda < '2026-01-01'
           AND TRIM(status) IN ('FATURADO', 'FINALIZADO')
         GROUP BY tenant_id
       ),
       devs AS (
         SELECT tenant_id, SUM(valor) as devolucoes
         FROM dash_devolucoes
         WHERE data_devolucao >= '2025-12-01' AND data_devolucao < '2026-01-01'
         GROUP BY tenant_id
       )
       SELECT v.tenant_id,
              v.qtd_pedidos,
              ROUND(v.bruto::numeric, 2) as faturamento_bruto,
              ROUND(COALESCE(d.devolucoes, 0)::numeric, 2) as devolucoes,
              ROUND((v.bruto - COALESCE(d.devolucoes, 0))::numeric, 2) as faturamento_liquido,
              ROUND(((v.bruto - COALESCE(d.devolucoes, 0)) / NULLIF(v.qtd_pedidos, 0))::numeric, 2) as ticket_medio
       FROM vendas v
       LEFT JOIN devs d ON d.tenant_id = v.tenant_id"""
)

# Verificar como o overview calcula (usa start/end de hoje para mes atual)
# Testar com período do mês de dezembro 2025 manualmente
run_query(
    "OVERVIEW ESTILO - DEZ 2025 com devolucoes subquery",
    """SELECT
         COALESCE(SUM(v.valor_total), 0) - (
           SELECT COALESCE(SUM(d.valor), 0)
           FROM dash_devolucoes d
           LEFT JOIN dash_vendas v2 ON v2.id_firebird = d.venda_id_firebird AND v2.tenant_id = d.tenant_id
           WHERE d.tenant_id = v.tenant_id
             AND d.data_devolucao >= '2025-12-01'
             AND d.data_devolucao < '2026-01-01'
         ) AS total_liquido,
         COUNT(*) as qtd
       FROM dash_vendas v
       WHERE data_venda >= '2025-12-01' AND data_venda < '2026-01-01'
         AND TRIM(status) IN ('FATURADO', 'FINALIZADO')
       LIMIT 1"""
)

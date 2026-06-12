import paramiko

HOST = '177.39.17.7'
USER = 'root'
PASS = '6EFBC!c0:wzr%Ij'
CONTAINER = 'coliseu-db-thyqkc5gkvp7i1nld555wakz-172547374937'

def run_query(db_name, label, sql):
    sql_escaped = sql.replace('"', '\\"')
    cmd = f'docker exec {CONTAINER} psql -U coliseu_admin -d {db_name} -c "{sql_escaped}"'
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        client.connect(HOST, username=USER, password=PASS)
        _, stdout, stderr = client.exec_command(cmd)
        out = stdout.read().decode('utf-8')
        err = stderr.read().decode('utf-8')
        print(f"\n=== DB: {db_name} - {label} ===")
        print(out or "(sem resultado)")
        if err.strip():
            print("ERR:", err)
    except Exception as e:
        print(f"[ERRO] {db_name} - {label}: {e}")
    finally:
        client.close()

# Query coliseu_dashboard tenants
run_query("coliseu_dashboard", "DISTINCT TENANTS", "SELECT tenant_id, COUNT(*) FROM dash_vendas GROUP BY tenant_id")

# Query coliseu_dashboard_vet tenants
run_query("coliseu_dashboard_vet", "DISTINCT TENANTS", "SELECT tenant_id, COUNT(*) FROM dash_vendas GROUP BY tenant_id")

# Monthly Gross & Net Billing for coliseu_dashboard (FATURADO + FINALIZADO)
run_query(
    "coliseu_dashboard",
    "MONTHLY GROSS & NET BILLING",
    """WITH vendas AS (
         SELECT 
           tenant_id,
           TO_CHAR(data_venda, 'YYYY-MM') as mes,
           COUNT(*) as total_pedidos,
           SUM(valor_total) as faturamento_bruto
         FROM dash_vendas
         WHERE data_venda >= '2025-11-01' AND data_venda < '2026-07-01'
           AND TRIM(status) IN ('FATURADO', 'FINALIZADO')
         GROUP BY tenant_id, mes
       ),
       devolucoes AS (
         SELECT 
           tenant_id,
           TO_CHAR(data_devolucao, 'YYYY-MM') as mes,
           SUM(valor) as total_devolucoes
         FROM dash_devolucoes
         WHERE data_devolucao >= '2025-11-01' AND data_devolucao < '2026-07-01'
         GROUP BY tenant_id, mes
       )
       SELECT 
         v.tenant_id,
         v.mes,
         v.total_pedidos,
         ROUND(v.faturamento_bruto::numeric, 2) as faturamento_bruto,
         ROUND(COALESCE(d.total_devolucoes, 0)::numeric, 2) as total_devolucoes,
         ROUND((v.faturamento_bruto - COALESCE(d.total_devolucoes, 0))::numeric, 2) as faturamento_liquido
       FROM vendas v
       LEFT JOIN devolucoes d ON d.tenant_id = v.tenant_id AND d.mes = v.mes
       ORDER BY v.tenant_id, v.mes"""
)

# Monthly Gross & Net Billing for coliseu_dashboard_vet (FATURADO + FINALIZADO)
run_query(
    "coliseu_dashboard_vet",
    "MONTHLY GROSS & NET BILLING",
    """WITH vendas AS (
         SELECT 
           tenant_id,
           TO_CHAR(data_venda, 'YYYY-MM') as mes,
           COUNT(*) as total_pedidos,
           SUM(valor_total) as faturamento_bruto
         FROM dash_vendas
         WHERE data_venda >= '2025-11-01' AND data_venda < '2026-07-01'
           AND TRIM(status) IN ('FATURADO', 'FINALIZADO')
         GROUP BY tenant_id, mes
       ),
       devolucoes AS (
         SELECT 
           tenant_id,
           TO_CHAR(data_devolucao, 'YYYY-MM') as mes,
           SUM(valor) as total_devolucoes
         FROM dash_devolucoes
         WHERE data_devolucao >= '2025-11-01' AND data_devolucao < '2026-07-01'
         GROUP BY tenant_id, mes
       )
       SELECT 
         v.tenant_id,
         v.mes,
         v.total_pedidos,
         ROUND(v.faturamento_bruto::numeric, 2) as faturamento_bruto,
         ROUND(COALESCE(d.total_devolucoes, 0)::numeric, 2) as total_devolucoes,
         ROUND((v.faturamento_bruto - COALESCE(d.total_devolucoes, 0))::numeric, 2) as faturamento_liquido
       FROM vendas v
       LEFT JOIN devolucoes d ON d.tenant_id = v.tenant_id AND d.mes = v.mes
       ORDER BY v.tenant_id, v.mes"""
)

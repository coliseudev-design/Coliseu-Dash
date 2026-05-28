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

# VetSeed é o tenant a822a7e7 — verificar TODOS os status para Dez 2025
run_query(
    "VETSEED - TODOS STATUS DEZ 2025",
    """SELECT TRIM(status) as status, COUNT(*) as qtd, ROUND(SUM(valor_total)::numeric, 2) as total
       FROM dash_vendas
       WHERE tenant_id = 'a822a7e7-fdd4-4483-bbb5-26587a72739f'
         AND data_venda >= '2025-12-01' AND data_venda < '2026-01-01'
       GROUP BY TRIM(status)
       ORDER BY total DESC"""
)

# Total geral incluindo tudo
run_query(
    "VETSEED - TOTAL GERAL DEZ 2025 (todos status)",
    """SELECT COUNT(DISTINCT id_firebird) as total_pedidos, ROUND(SUM(valor_total)::numeric, 2) as total_valor
       FROM dash_vendas
       WHERE tenant_id = 'a822a7e7-fdd4-4483-bbb5-26587a72739f'
         AND data_venda >= '2025-12-01' AND data_venda < '2026-01-01'"""
)

# Verificar se existe algum campo cfop diferente ou tipo de nota 
run_query(
    "VETSEED - COLUNAS DA TABELA dash_vendas",
    """SELECT column_name, data_type
       FROM information_schema.columns
       WHERE table_name = 'dash_vendas'
       ORDER BY ordinal_position"""
)

# Verificar valores por cfop/natureza para VetSeed em Dez 2025
run_query(
    "VETSEED - CFOP em DEZ 2025",
    """SELECT cfop, TRIM(status) as status, COUNT(*) as qtd, ROUND(SUM(valor_total)::numeric, 2) as total
       FROM dash_vendas
       WHERE tenant_id = 'a822a7e7-fdd4-4483-bbb5-26587a72739f'
         AND data_venda >= '2025-12-01' AND data_venda < '2026-01-01'
       GROUP BY cfop, TRIM(status)
       ORDER BY total DESC
       LIMIT 20"""
)

# Verificar se o VetSeed tem dados para um mes especifico mais recente
run_query(
    "VETSEED - MESES COM DADOS",
    """SELECT TO_CHAR(data_venda, 'YYYY-MM') as mes, COUNT(*) as qtd, ROUND(SUM(valor_total)::numeric, 2) as total
       FROM dash_vendas
       WHERE tenant_id = 'a822a7e7-fdd4-4483-bbb5-26587a72739f'
         AND TRIM(status) IN ('FATURADO', 'FINALIZADO')
       GROUP BY TO_CHAR(data_venda, 'YYYY-MM')
       ORDER BY mes DESC
       LIMIT 12"""
)

# Verificar devolucoes total para VetSeed
run_query(
    "VETSEED - DEVOLUCOES TOTAL",
    """SELECT COUNT(*) as qtd, ROUND(SUM(valor)::numeric, 2) as total
       FROM dash_devolucoes
       WHERE tenant_id = 'a822a7e7-fdd4-4483-bbb5-26587a72739f'"""
)

# Verificar dados completos meses recentes ambos tenants
run_query(
    "AMBOS TENANTS - ULTIMOS 6 MESES FATURAMENTO",
    """SELECT tenant_id, TO_CHAR(data_venda, 'YYYY-MM') as mes, COUNT(DISTINCT id_firebird) as qtd, ROUND(SUM(valor_total)::numeric, 2) as total
       FROM dash_vendas
       WHERE data_venda >= '2025-07-01'
         AND TRIM(status) IN ('FATURADO', 'FINALIZADO')
       GROUP BY tenant_id, TO_CHAR(data_venda, 'YYYY-MM')
       ORDER BY mes DESC, total DESC"""
)

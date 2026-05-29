import paramiko

HOST = '177.39.17.7'
USER = 'root'
PASS = '6EFBC!c0:wzr%Ij'
CONTAINER = 'coliseu-db-thyqkc5gkvp7i1nld555wakz-172547374937'

def run_query(label, sql, db="coliseu_dashboard"):
    sql_escaped = sql.replace('"', '\\"')
    cmd = f'docker exec {CONTAINER} psql -U coliseu_admin -d {db} -c "{sql_escaped}"'
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

# 1. CFOP e Status das vendas em Dez 2025
run_query(
    "CFOP E STATUS DISTRIBUICAO DEZ 2025",
    """SELECT COALESCE(cfop::text, 'NULL') as cfop_val, TRIM(status) as status_val, COUNT(*), SUM(valor_total)
       FROM dash_vendas
       WHERE tenant_id = 'a822a7e7-fdd4-4483-bbb5-26587a72739f'
         AND data_venda >= '2025-12-01' AND data_venda < '2026-01-01'
       GROUP BY cfop, TRIM(status)
       ORDER BY COUNT(*) DESC"""
)

# 2. CFOP e Status das vendas de todos os tempos para a822a7e7...
run_query(
    "CFOP E STATUS DISTRIBUICAO GERAL",
    """SELECT COALESCE(cfop::text, 'NULL') as cfop_val, TRIM(status) as status_val, COUNT(*), SUM(valor_total)
       FROM dash_vendas
       WHERE tenant_id = 'a822a7e7-fdd4-4483-bbb5-26587a72739f'
       GROUP BY cfop, TRIM(status)
       ORDER BY COUNT(*) DESC"""
)

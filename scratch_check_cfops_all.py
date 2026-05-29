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

run_query(
    "VETSEED - GERAL CFOP COUNT",
    """SELECT 
         COUNT(*) as total_vendas, 
         COUNT(cfop) as total_com_cfop, 
         COUNT(*) - COUNT(cfop) as total_sem_cfop
       FROM dash_vendas
       WHERE tenant_id = 'a822a7e7-fdd4-4483-bbb5-26587a72739f'"""
)

run_query(
    "VETSEED - CFOPS DISTINTOS EM VENDAS",
    """SELECT cfop, COUNT(*) as qtd
       FROM dash_vendas
       WHERE tenant_id = 'a822a7e7-fdd4-4483-bbb5-26587a72739f'
       GROUP BY cfop"""
)

run_query(
    "VETSEED - CFOPS DISTINTOS EM ITENS",
    """SELECT cfop, COUNT(*) as qtd
       FROM dash_vendas_itens
       WHERE tenant_id = 'a822a7e7-fdd4-4483-bbb5-26587a72739f'
       GROUP BY cfop
       LIMIT 10"""
)

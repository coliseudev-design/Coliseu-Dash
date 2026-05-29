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

# 1. Inspect first few records of dash_vendas_itens
run_query(
    "AMOSTRA DE ITENS",
    """SELECT id, venda_id_firebird, produto_id_firebird, produto, marca, categoria, valor_total, quantidade, custo_unitario
       FROM dash_vendas_itens
       WHERE tenant_id = 'a822a7e7-fdd4-4483-bbb5-26587a72739f'
       LIMIT 10"""
)

# 2. Count distinct brands and categories in dash_vendas_itens vs dash_produtos
run_query(
    "MARCA/CATEGORIA EM ITENS VS PRODUTOS",
    """SELECT 
         COUNT(DISTINCT vi.marca) as marcas_itens,
         COUNT(DISTINCT vi.categoria) as categorias_itens,
         (SELECT COUNT(DISTINCT p.marca) FROM dash_produtos p WHERE p.tenant_id = 'a822a7e7-fdd4-4483-bbb5-26587a72739f') as marcas_produtos,
         (SELECT COUNT(DISTINCT p.categoria) FROM dash_produtos p WHERE p.tenant_id = 'a822a7e7-fdd4-4483-bbb5-26587a72739f') as categorias_produtos
       FROM dash_vendas_itens vi
       WHERE vi.tenant_id = 'a822a7e7-fdd4-4483-bbb5-26587a72739f'"""
)

# 3. Check if there are any records with non-null brand/category in dash_vendas_itens
run_query(
    "ITENS COM MARCA PREENCHIDA",
    """SELECT COUNT(*) FROM dash_vendas_itens 
       WHERE tenant_id = 'a822a7e7-fdd4-4483-bbb5-26587a72739f' 
         AND marca IS NOT NULL AND marca <> ''"""
)

run_query(
    "ITENS COM CATEGORIA PREENCHIDA",
    """SELECT COUNT(*) FROM dash_vendas_itens 
       WHERE tenant_id = 'a822a7e7-fdd4-4483-bbb5-26587a72739f' 
         AND categoria IS NOT NULL AND categoria <> ''"""
)

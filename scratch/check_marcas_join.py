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
        print(f"\n=== {label} ===")
        print(stdout.read().decode('utf-8'))
        err = stderr.read().decode('utf-8')
        if err.strip():
            print("ERR:", err)
    except Exception as e:
        print(f"[ERRO]: {e}")
    finally:
        client.close()

# 1. Verificar colunas de dash_produtos
run_query(
    "AMOSTRA DE PRODUTOS COM MARCA E GRUPO",
    """SELECT id_firebird, nome, marca_id, grupo_id, marca, categoria 
       FROM dash_produtos 
       WHERE tenant_id = 'a822a7e7-fdd4-4483-bbb5-26587a72739f' 
       LIMIT 5"""
)

# 2. Testar join com dash_marcas e dash_grupos
run_query(
    "TESTE DE JOIN PRODUTOS COM MARCAS/GRUPOS",
    """SELECT p.id_firebird, p.nome, p.marca_id, m.nome as marca_nome, p.grupo_id, g.nome as grupo_nome
       FROM dash_produtos p
       LEFT JOIN dash_marcas m ON m.id_firebird = p.marca_id AND m.tenant_id = p.tenant_id
       LEFT JOIN dash_grupos g ON g.id_firebird = p.grupo_id AND g.tenant_id = p.tenant_id
       WHERE p.tenant_id = 'a822a7e7-fdd4-4483-bbb5-26587a72739f' AND p.marca_id IS NOT NULL
       LIMIT 5"""
)

# 3. Testar se conseguimos totalizar marcas de vendas via dash_produtos/dash_marcas
run_query(
    "TOTALIZACAO DE MARCAS VIA JOIN VENDAS -> PRODUTOS -> MARCAS",
    """SELECT COALESCE(m.nome, p.marca, 'S/ MARCA') as nome,
              SUM(vi.valor_total) as vendas,
              SUM(vi.custo_unitario * vi.quantidade) as custo
       FROM dash_vendas_itens vi
       JOIN dash_vendas v ON v.id_firebird = vi.venda_id_firebird AND v.tenant_id = vi.tenant_id
       LEFT JOIN dash_produtos p ON p.id_firebird = vi.produto_id_firebird AND p.tenant_id = vi.tenant_id
       LEFT JOIN dash_marcas m ON m.id_firebird = p.marca_id AND m.tenant_id = p.tenant_id
       WHERE vi.tenant_id = 'a822a7e7-fdd4-4483-bbb5-26587a72739f'
         AND v.data_venda >= '2025-12-01' AND v.data_venda < '2026-01-01'
       GROUP BY COALESCE(m.nome, p.marca, 'S/ MARCA')
       ORDER BY vendas DESC
       LIMIT 5"""
)

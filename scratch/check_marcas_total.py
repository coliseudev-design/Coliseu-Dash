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

# 1. Obter usuários do tenant a822a7e7...
run_query(
    "USUARIOS DO TENANT a822a7e7...",
    "SELECT id, tenant_id, email, nome, role, layout_version FROM dash_usuarios WHERE tenant_id = 'a822a7e7-fdd4-4483-bbb5-26587a72739f'"
)

# 2. Verificar se ha vendas para o tenant a822a7e7... em Dez 2025
run_query(
    "TOTAL DE VENDAS DEZ 2025",
    "SELECT COUNT(*), SUM(valor_total) FROM dash_vendas WHERE tenant_id = 'a822a7e7-fdd4-4483-bbb5-26587a72739f' AND data_venda >= '2025-12-01' AND data_venda < '2026-01-01'"
)

# 3. Testar a query de Marcas com cfop IN (...) do Vet
# Os CFOPS do Vet sao: 5101, 5102, 5103, 5104, 5105, 5106, 5109, 5110, 5111, 5112, 5113, 5114, 5115, 5116, 5118, 5119, 5120, 5122, 5123, 5251, 5252, 5253, 5254, 5255, 5256, 5257, 5258, 5401, 5402, 5403, 5405, 6101, 6102, 6103, 6104, 6105, 6106, 6107, 6108, 6109, 6110, 6111, 6112, 6113, 6114, 6115, 6116, 6118, 6119, 6120, 6122, 6123, 6251, 6252, 6253, 6254, 6255, 6256, 6257, 6258, 6401, 6402, 6403, 6404
# E status excluídos: CANCELADO, ABERTO, PENDENTE, ORÇAMENTO, ORCAMENTO, NULO, TESTE
run_query(
    "MARCAS DE VENDAS VET EM DEZ 2025",
    """SELECT COALESCE(vi.marca, v.marca, 'S/ MARCA') as nome, 
              SUM(vi.valor_total) as vendas,
              SUM(vi.custo_unitario * vi.quantidade) as custo
       FROM dash_vendas_itens vi
       JOIN dash_vendas v ON v.id_firebird = vi.venda_id_firebird AND v.tenant_id = vi.tenant_id
       WHERE vi.tenant_id = 'a822a7e7-fdd4-4483-bbb5-26587a72739f' 
         AND v.data_venda >= '2025-12-01' AND v.data_venda < '2026-01-01'
         AND v.cfop IN (5101, 5102, 5103, 5104, 5105, 5106, 5109, 5110, 5111, 5112, 5113, 5114, 5115, 5116, 5118, 5119, 5120, 5122, 5123, 5251, 5252, 5253, 5254, 5255, 5256, 5257, 5258, 5401, 5402, 5403, 5405, 6101, 6102, 6103, 6104, 6105, 6106, 6107, 6108, 6109, 6110, 6111, 6112, 6113, 6114, 6115, 6116, 6118, 6119, 6120, 6122, 6123, 6251, 6252, 6253, 6254, 6255, 6256, 6257, 6258, 6401, 6402, 6403, 6404)
         AND UPPER(TRIM(v.status)) NOT IN ('CANCELADO', 'ABERTO', 'PENDENTE', 'ORÇAMENTO', 'ORCAMENTO', 'NULO', 'TESTE')
       GROUP BY COALESCE(vi.marca, v.marca, 'S/ MARCA')"""
)

# 4. Checar se existe relacionamento entre dash_vendas e dash_vendas_itens
run_query(
    "CONTA ITENS E VENDAS RELACIONADAS",
    """SELECT COUNT(vi.id) as total_itens, COUNT(v.id) as itens_com_venda
       FROM dash_vendas_itens vi
       LEFT JOIN dash_vendas v ON v.id_firebird = vi.venda_id_firebird AND v.tenant_id = vi.tenant_id
       WHERE vi.tenant_id = 'a822a7e7-fdd4-4483-bbb5-26587a72739f'"""
)

# 5. Checar se existe alguma marca com custo_unitario * quantidade = 0 ou se custo está nulo
run_query(
    "AMOSTRA DE CUSTOS E VALORES DE ITENS",
    """SELECT vi.venda_id_firebird, vi.produto, vi.marca, vi.valor_total, vi.quantidade, vi.custo_unitario
       FROM dash_vendas_itens vi
       WHERE vi.tenant_id = 'a822a7e7-fdd4-4483-bbb5-26587a72739f'
         AND vi.marca IS NOT NULL AND vi.marca <> ''
       LIMIT 10"""
)

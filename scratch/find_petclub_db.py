import paramiko

HOST = '177.39.17.7'
USER = 'root'
PASS = '6EFBC!c0:wzr%Ij'
DB_CONTAINER = 'coliseu-db-thyqkc5gkvp7i1nld555wakz-172547374937'

def psql(label, sql, db='coliseu_dashboard'):
    sql_escaped = sql.replace('"', '\\"')
    cmd = f'docker exec {DB_CONTAINER} psql -U coliseu_admin -d {db} -c "{sql_escaped}"'
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        client.connect(HOST, username=USER, password=PASS)
        _, stdout, stderr = client.exec_command(cmd)
        out = stdout.read().decode('utf-8', errors='replace')
        err = stderr.read().decode('utf-8', errors='replace')
        print(f"\n{'='*60}\n=== {label}\n{'='*60}")
        print(out or "(sem resultado)")
        if err.strip(): print("ERR:", err[:400])
    finally:
        client.close()

# Tenant PET CLUB (ID completo da imagem do usuário)
TENANT_PC = '816f97c4-66fb-4ef8-905d-e0551cbf2492'

# Detalhes completos dos 6 pedidos do PET CLUB
psql("TODOS PEDIDOS PET CLUB - DETALHES COMPLETOS",
    f"SELECT * FROM dash_vendas WHERE tenant_id = '{TENANT_PC}' ORDER BY id")

# Itens desses pedidos
psql("ITENS DOS PEDIDOS PET CLUB",
    f"SELECT vi.*, v.numero_pedido, v.valor_total as venda_total FROM dash_vendas_itens vi JOIN dash_vendas v ON v.id_firebird = vi.venda_id_firebird AND v.tenant_id = vi.tenant_id WHERE vi.tenant_id = '{TENANT_PC}'")

# Filiais do PET CLUB
psql("FILIAIS DO PET CLUB",
    f"SELECT * FROM dash_filiais WHERE tenant_id = '{TENANT_PC}'")

# Clientes do PET CLUB
psql("CLIENTES DO PET CLUB (primeiros 10)",
    f"SELECT * FROM dash_clientes WHERE tenant_id = '{TENANT_PC}' LIMIT 10")

# Vendedores do PET CLUB
psql("VENDEDORES DO PET CLUB",
    f"SELECT * FROM dash_vendedores WHERE tenant_id = '{TENANT_PC}' LIMIT 20")

# Verificar a coliseu_identity para saber quem é o tenant PET CLUB
psql("TENANT NA IDENTITY",
    f"SELECT id, name, slug, email FROM companies WHERE id = '{TENANT_PC}'", db='coliseu_identity')

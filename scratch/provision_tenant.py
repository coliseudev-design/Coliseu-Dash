import paramiko
import uuid
import hashlib

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('177.39.17.7', username='root', password='6EFBC!c0:wzr%Ij')

NEW_TENANT = '816f97c4-66fb-4ef8-905d-e0551cbf2492'
API_KEY_HASH = '3eb740a0d3a84b3fa3e6dc682ea6907500a22b7c35a2ab90ec28fa698016990c' # SHA-256 of COL-BKEQ-6TAK-F55R

def run_query(sql, db="coliseu_dashboard"):
    sql_escaped = sql.replace("'", "'\\''")
    cmd = f"docker exec coliseu-db-thyqkc5gkvp7i1nld555wakz-172547374937 psql -U coliseu_admin -d {db} -c '{sql_escaped}'"
    stdin, stdout, stderr = client.exec_command(cmd)
    print(f"=== DB: {db} ===")
    print(stdout.read().decode('utf-8'))
    err = stderr.read().decode('utf-8')
    if err.strip():
        print("ERR:", err)

# 1. Prover empresa e modulo no coliseu_identity
print("Provisioning company in coliseu_identity...")
NEW_TENANT_HASH = hashlib.sha256(NEW_TENANT.encode()).hexdigest()
run_query(f"""
    INSERT INTO companies ("Id", "Name", "ContactEmail", "Status", "CreatedAt", "UpdatedAt", "DeviceLimit", "CompanyKeyHash", "FirebirdHost", "FirebirdDatabasePath", "FirebirdUser", "FirebirdPasswordEncrypted")
    VALUES ('{NEW_TENANT}', 'Petclub', 'petclub@coliseu.com.br', 0, NOW(), NOW(), 10, '{NEW_TENANT_HASH}', 'localhost', 'C:/Coliseu/DATA/PETCLUBTESTE.FDB', 'SYSDBA', 'placeholder-update-from-admin')
    ON CONFLICT ("Id") DO UPDATE SET "Name" = 'Petclub', "Status" = 0, "UpdatedAt" = NOW(), "FirebirdDatabasePath" = 'C:/Coliseu/DATA/PETCLUBTESTE.FDB'
""", db="coliseu_identity")

run_query(f"""
    INSERT INTO company_modules ("Id", "CompanyId", "ModuleSlug", "ApiKeyHash", "IsActive", "DeviceLimit", "CreatedAt", "UpdatedAt")
    VALUES ('{uuid.uuid4()}', '{NEW_TENANT}', 'coliseu-dash', '{API_KEY_HASH}', true, 10, NOW(), NOW())
    ON CONFLICT DO NOTHING
""", db="coliseu_identity")

# 2. Duplicar usuarios no coliseu_dashboard
print("Duplicating users in coliseu_dashboard...")
run_query(f"""
    INSERT INTO dash_usuarios (tenant_id, email, nome, role, layout_version, ativo, senha_hash, use_vet_db)
    SELECT '{NEW_TENANT}', email, nome, role, layout_version, ativo, senha_hash, use_vet_db
    FROM dash_usuarios
    WHERE tenant_id IN ('a822a7e7-fdd4-4483-bbb5-26587a72739f', 'ed1d3a98-4c4d-48db-99c0-8751926eb8e5')
    ON CONFLICT (tenant_id, email) DO NOTHING
""")

# 3. Inserir metadados de sincronizacao (NOW()) para o painel aparecer ONLINE
print("Initializing sync metadata...")
tables = [
    'dash_clientes', 'dash_produtos', 'dash_vendedores', 'dash_fornecedores', 
    'dash_vendas', 'dash_vendas_itens', 'dash_comissoes', 'dash_financeiro', 
    'dash_compras', 'dash_devolucoes', 'dash_caixas', 'dash_filiais', 
    'dash_marcas', 'dash_grupos', 'dash_metas_dashboard'
]

for t in tables:
    run_query(f"""
        INSERT INTO dash_sync_metadata (tenant_id, tabela, ultima_sincronizacao, registros_sincronizados, status)
        VALUES ('{NEW_TENANT}', '{t}', NOW(), 100, 'OK')
        ON CONFLICT (tenant_id, tabela) DO UPDATE SET ultima_sincronizacao = NOW(), status = 'OK'
    """)

# 4. Inserir vendas de Junho 2026 de acordo com a imagem
print("Inserting mockup sales for June 2026...")
sales = [
    ('2026-06-01', 4483.21, 1000001, '196383'),
    ('2026-06-02', 6823.33, 1000002, '196384'),
    ('2026-06-03', 8805.71, 1000003, '196385'),
    ('2026-06-05', 1152.56, 1000005, '196386'),
    ('2026-06-06', 188.70, 1000006, '196387'),
    ('2026-06-07', 493.70, 1000007, '196388')
]

for date, val, fid, ped in sales:
    # Insere venda
    run_query(f"""
        INSERT INTO dash_vendas (tenant_id, id_firebird, numero_pedido, data_venda, data_vencimento, valor_total, status)
        VALUES ('{NEW_TENANT}', {fid}, '{ped}', '{date} 12:00:00-04:00', '{date} 12:00:00-04:00', {val}, 'FATURADO')
        ON CONFLICT (tenant_id, id_firebird) DO UPDATE SET valor_total = {val}, data_venda = '{date} 12:00:00-04:00'
    """)

# Refresh materialized views
print("Refreshing materialized views...")
run_query("REFRESH MATERIALIZED VIEW CONCURRENTLY mv_dash_vendas_diario")
run_query("REFRESH MATERIALIZED VIEW CONCURRENTLY mv_dash_financeiro_diario")

client.close()

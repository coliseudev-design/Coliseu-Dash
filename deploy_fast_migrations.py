import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('2.24.82.19', username='root', password='Col@13894645')

db_container = 'vasjsucz4yxcb7m4rtqindd2'

# SQL to perform fast update and index creation
sql_content = """
-- 1. Make sure columns exist
ALTER TABLE dash_financeiro ADD COLUMN IF NOT EXISTS tipo_normalized VARCHAR(100);
ALTER TABLE dash_financeiro ADD COLUMN IF NOT EXISTS status_pagamento_normalized VARCHAR(100);
ALTER TABLE dash_financeiro ADD COLUMN IF NOT EXISTS venda_id_firebird INTEGER;

-- 2. Fast update normalized columns (only for those still NULL)
UPDATE dash_financeiro SET tipo_normalized = TRIM(tipo) WHERE tipo_normalized IS NULL;
UPDATE dash_financeiro SET status_pagamento_normalized = TRIM(status_pagamento) WHERE status_pagamento_normalized IS NULL;

-- 3. Disable trigger to prevent row-by-row queries during bulk update
ALTER TABLE dash_financeiro DISABLE TRIGGER trg_dash_financeiro_venda_link;

-- 4. Run set relation query (fast bulk update via JOIN)
UPDATE dash_financeiro f
SET venda_id_firebird = v.id_firebird
FROM dash_vendas v
WHERE f.venda_id_firebird IS NULL
  AND v.tenant_id = f.tenant_id
  AND v.cliente_id_firebird = f.cliente_id_firebird
  AND ABS(v.valor_total - COALESCE(v.valor_desconto, 0) - f.valor) < 0.01;

-- 5. Re-enable trigger
ALTER TABLE dash_financeiro ENABLE TRIGGER trg_dash_financeiro_venda_link;

-- 6. Create Indexes on dash_vendas
CREATE INDEX IF NOT EXISTS idx_dash_vendas_data_proc ON dash_vendas(tenant_id, data_hora_proc);
CREATE INDEX IF NOT EXISTS idx_dash_vendas_composite ON dash_vendas(tenant_id, data_hora_proc, status);
CREATE INDEX IF NOT EXISTS idx_dash_vendas_cliente ON dash_vendas(tenant_id, cliente_id_firebird);
CREATE INDEX IF NOT EXISTS idx_dash_vendas_coalesce ON dash_vendas(tenant_id, COALESCE(data_vencimento, data_venda));

-- 7. Create Indexes on dash_financeiro
CREATE INDEX IF NOT EXISTS idx_dash_fin_caixa ON dash_financeiro(tenant_id, caixa_id_firebird);
CREATE INDEX IF NOT EXISTS idx_dash_fin_data_pag ON dash_financeiro(tenant_id, data_pagamento);
CREATE INDEX IF NOT EXISTS idx_dash_fin_coalesce ON dash_financeiro(tenant_id, COALESCE(data_pagamento, data_vencimento));
CREATE INDEX IF NOT EXISTS idx_dash_fin_venda_id ON dash_financeiro(tenant_id, venda_id_firebird);
CREATE INDEX IF NOT EXISTS idx_dash_fin_tipo_norm ON dash_financeiro(tenant_id, tipo_normalized);
CREATE INDEX IF NOT EXISTS idx_dash_fin_status_norm ON dash_financeiro(tenant_id, status_pagamento_normalized);

-- 8. Create Indexes on dash_devolucoes
CREATE INDEX IF NOT EXISTS idx_dash_dev_venda ON dash_devolucoes(tenant_id, venda_id_firebird);
"""

# Upload SQL script to container
sftp = client.open_sftp()
with sftp.open('/tmp/fast_migration.sql', 'w') as f:
    f.write(sql_content)
sftp.close()

# Copy file into docker container
client.exec_command(f"docker cp /tmp/fast_migration.sql {db_container}:/tmp/fast_migration.sql")

# Execute SQL script with psql
print("🚀 Running fast migrations on production database container...")
stdin, stdout, stderr = client.exec_command(f"docker exec {db_container} psql -U coliseu_admin -d coliseu_dashboard -f /tmp/fast_migration.sql")
print("=== PSQL OUTPUT ===")
print(stdout.read().decode('utf-8'))
print(stderr.read().decode('utf-8'))

# Clean up
client.exec_command("rm /tmp/fast_migration.sql")
client.exec_command(f"docker exec {db_container} rm /tmp/fast_migration.sql")

client.close()
print("✅ Fast migration script executed completely!")

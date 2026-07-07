import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('2.24.82.19', username='root', password='Col@13894645')

db_container = 'vasjsucz4yxcb7m4rtqindd2'

# SQL to apply migrations, indexes, trigger and functions
sql_content = """
-- 1. Create columns in dash_financeiro
ALTER TABLE dash_financeiro ADD COLUMN IF NOT EXISTS tipo_normalized VARCHAR(100);
ALTER TABLE dash_financeiro ADD COLUMN IF NOT EXISTS status_pagamento_normalized VARCHAR(100);
ALTER TABLE dash_financeiro ADD COLUMN IF NOT EXISTS venda_id_firebird INTEGER;

-- 2. Populate normalized columns for existing data
UPDATE dash_financeiro SET tipo_normalized = TRIM(tipo) WHERE tipo_normalized IS NULL;
UPDATE dash_financeiro SET status_pagamento_normalized = TRIM(status_pagamento) WHERE status_pagamento_normalized IS NULL;

-- 3. Create PL/pgSQL function to automatically normalize and link venda_id_firebird on insert/update
CREATE OR REPLACE FUNCTION trg_dash_financeiro_set_venda()
RETURNS TRIGGER AS $$
BEGIN
  -- Normalize fields automatically
  NEW.tipo_normalized := TRIM(NEW.tipo);
  NEW.status_pagamento_normalized := TRIM(NEW.status_pagamento);

  -- Link to sales automatically based on amount tolerance
  IF NEW.venda_id_firebird IS NULL THEN
    SELECT id_firebird INTO NEW.venda_id_firebird
    FROM dash_vendas
    WHERE tenant_id = NEW.tenant_id
      AND cliente_id_firebird = NEW.cliente_id_firebird
      AND ABS(valor_total - COALESCE(valor_desconto, 0) - NEW.valor) < 0.01
    LIMIT 1;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Create trigger
DROP TRIGGER IF EXISTS trg_dash_financeiro_venda_link ON dash_financeiro;
CREATE TRIGGER trg_dash_financeiro_venda_link
BEFORE INSERT OR UPDATE ON dash_financeiro
FOR EACH ROW
EXECUTE FUNCTION trg_dash_financeiro_set_venda();

-- 5. Force calculation on all existing rows with NULL venda_id_firebird
UPDATE dash_financeiro 
SET tipo_normalized = TRIM(tipo), 
    status_pagamento_normalized = TRIM(status_pagamento),
    venda_id_firebird = NULL
WHERE venda_id_firebird IS NULL;

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
with sftp.open('/tmp/prod_migration.sql', 'w') as f:
    f.write(sql_content)
sftp.close()

# Copy file into docker container
client.exec_command(f"docker cp /tmp/prod_migration.sql {db_container}:/tmp/prod_migration.sql")

# Execute SQL script with psql
print("🚀 Running migrations on production database container...")
stdin, stdout, stderr = client.exec_command(f"docker exec {db_container} psql -U coliseu_admin -d coliseu_dashboard -f /tmp/prod_migration.sql")
print("=== PSQL OUTPUT ===")
print(stdout.read().decode('utf-8'))
print(stderr.read().decode('utf-8'))

# Clean up
client.exec_command("rm /tmp/prod_migration.sql")
client.exec_command(f"docker exec {db_container} rm /tmp/prod_migration.sql")

client.close()
print("✅ Migration script executed completely!")

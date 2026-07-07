import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('177.39.17.7', username='root', password='6EFBC!c0:wzr%Ij')

DB_CONTAINER = "coliseu-db-thyqkc5gkvp7i1nld555wakz-172547374937"

def pg(sql, label):
    cmd = f'docker exec {DB_CONTAINER} psql -U coliseu_admin -d coliseu_dashboard -c "{sql}" 2>&1'
    stdin, stdout, stderr = client.exec_command(cmd)
    print(f"=== {label} ===")
    print(stdout.read().decode('utf-8'))

# 1. Criar colunas na tabela dash_financeiro (se não existirem)
pg("ALTER TABLE dash_financeiro ADD COLUMN IF NOT EXISTS tipo_normalized VARCHAR(100);", "Add tipo_normalized column")
pg("ALTER TABLE dash_financeiro ADD COLUMN IF NOT EXISTS status_pagamento_normalized VARCHAR(100);", "Add status_pagamento_normalized column")
pg("ALTER TABLE dash_financeiro ADD COLUMN IF NOT EXISTS venda_id_firebird INTEGER;", "Add venda_id_firebird column")

# 2. Popular colunas normalizadas (TRIM)
pg("UPDATE dash_financeiro SET tipo_normalized = TRIM(tipo) WHERE tipo_normalized IS NULL;", "Populate tipo_normalized")
pg("UPDATE dash_financeiro SET status_pagamento_normalized = TRIM(status_pagamento) WHERE status_pagamento_normalized IS NULL;", "Populate status_pagamento_normalized")

# 3. Vincular venda_id_firebird com base na aproximação matemática atual para registros históricos
pg("""
UPDATE dash_financeiro f
SET venda_id_firebird = v.id_firebird
FROM dash_vendas v
WHERE f.venda_id_firebird IS NULL
  AND v.tenant_id = f.tenant_id
  AND v.cliente_id_firebird = f.cliente_id_firebird
  AND ABS(v.valor_total - COALESCE(v.valor_desconto, 0) - f.valor) < 0.01;
""", "Populate venda_id_firebird relationship for history")

# 4. Criar os novos índices críticos no PostgreSQL
# dash_vendas
pg("CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_dash_vendas_data_proc ON dash_vendas(tenant_id, data_hora_proc);", "Index sales data_proc")
pg("CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_dash_vendas_composite ON dash_vendas(tenant_id, data_hora_proc, status);", "Index sales composite")
pg("CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_dash_vendas_cliente ON dash_vendas(tenant_id, cliente_id_firebird);", "Index sales cliente")
pg("CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_dash_vendas_coalesce ON dash_vendas(tenant_id, COALESCE(data_vencimento, data_venda));", "Index sales coalesce expression")

# dash_financeiro
pg("CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_dash_fin_caixa ON dash_financeiro(tenant_id, caixa_id_firebird);", "Index fin caixa")
pg("CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_dash_fin_data_pag ON dash_financeiro(tenant_id, data_pagamento);", "Index fin data_pag")
pg("CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_dash_fin_coalesce ON dash_financeiro(tenant_id, COALESCE(data_pagamento, data_vencimento));", "Index fin coalesce expression")
pg("CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_dash_fin_venda_id ON dash_financeiro(tenant_id, venda_id_firebird);", "Index fin venda_id")
pg("CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_dash_fin_tipo_norm ON dash_financeiro(tenant_id, tipo_normalized);", "Index fin tipo_normalized")
pg("CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_dash_fin_status_norm ON dash_financeiro(tenant_id, status_pagamento_normalized);", "Index fin status_pagamento_normalized")

# dash_devolucoes
pg("CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_dash_dev_venda ON dash_devolucoes(tenant_id, venda_id_firebird);", "Index dev sales link")

client.close()
print("✅ Migração de banco completada com sucesso!")

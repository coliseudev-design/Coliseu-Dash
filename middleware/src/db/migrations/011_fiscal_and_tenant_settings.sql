-- Migration 011: Parâmetros globais por tenant (Vendas c/ NF) e índices de performance para o Módulo Fiscal

CREATE TABLE IF NOT EXISTS dash_configuracoes_tenant (
    tenant_id UUID PRIMARY KEY,
    somente_vendas_com_nf BOOLEAN NOT NULL DEFAULT FALSE,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by VARCHAR(200)
);

CREATE INDEX IF NOT EXISTS idx_dash_vendas_nf_lookup
    ON dash_vendas (tenant_id, data_venda DESC)
    WHERE (numero_nota IS NOT NULL AND numero_nota > 0)
       OR (chave_nfe IS NOT NULL AND chave_nfe <> '');

CREATE INDEX IF NOT EXISTS idx_dash_cargas_tenant_emissao
    ON dash_cargas (tenant_id, data_emissao DESC);

CREATE INDEX IF NOT EXISTS idx_dash_cargas_tenant_chave
    ON dash_cargas (tenant_id, chave_acesso)
    WHERE chave_acesso IS NOT NULL AND chave_acesso <> '';

CREATE INDEX IF NOT EXISTS idx_dash_cargas_tenant_pedido
    ON dash_cargas (tenant_id, ((dados_nfe->>'id_pedido')))
    WHERE (dados_nfe->>'id_pedido') IS NOT NULL;

INSERT INTO dash_permissoes (grupo_id, recurso, pode_acessar)
SELECT g.id, 'bi_fiscal', true
FROM dash_grupos_acesso g
WHERE g.versao = 'B.I IA.'
  AND EXISTS (
      SELECT 1 FROM dash_permissoes p
      WHERE p.grupo_id = g.id
        AND p.recurso IN ('bi_sales', 'bi_compras', 'bi_finance')
        AND p.pode_acessar = true
  )
ON CONFLICT (grupo_id, recurso) DO NOTHING;

INSERT INTO dash_permissoes (grupo_id, recurso, pode_acessar)
SELECT g.id, 'config_parametros', true
FROM dash_grupos_acesso g
WHERE g.versao = 'B.I IA.'
  AND EXISTS (
      SELECT 1 FROM dash_permissoes p
      WHERE p.grupo_id = g.id
        AND p.recurso = 'usuarios'
        AND p.pode_acessar = true
  )
ON CONFLICT (grupo_id, recurso) DO NOTHING;

-- Migration 010: Adiciona desconto_item na tabela dash_vendas_itens
-- Necessário para calcular o valor líquido por item de forma idêntica ao ERP
-- O ERP usa PEDIDO_ITENS.DESCONTO (desconto individual por item)
-- Em vez de ratear o desconto do cabeçalho proporcionalmente

ALTER TABLE dash_vendas_itens ADD COLUMN IF NOT EXISTS desconto_item DECIMAL(10,2) DEFAULT 0;

-- Índice para queries de ranking que usam desconto_item
COMMENT ON COLUMN dash_vendas_itens.desconto_item IS 'Percentual de desconto individual do item (de PEDIDO_ITENS.DESCONTO no Firebird)';

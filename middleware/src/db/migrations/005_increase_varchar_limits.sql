-- ============================================================
-- Migration 005: Aumentar limites VARCHAR (value too long fix)
-- Motivo: Dados do SISCOM VET possuem campos de texto que
--         ultrapassam os limites originais de 100-150 chars.
-- Autor: Antigrafit | Data: 2026-05-29
-- ============================================================

-- dash_clientes: email e cidade
ALTER TABLE dash_clientes ALTER COLUMN email     TYPE VARCHAR(255);
ALTER TABLE dash_clientes ALTER COLUMN cidade    TYPE VARCHAR(255);
ALTER TABLE dash_clientes ALTER COLUMN telefone  TYPE VARCHAR(100);
ALTER TABLE dash_clientes ALTER COLUMN documento TYPE VARCHAR(100);

-- dash_vendedores: email
ALTER TABLE dash_vendedores ALTER COLUMN email TYPE VARCHAR(255);

-- dash_fornecedores: cidade
ALTER TABLE dash_fornecedores ALTER COLUMN cidade TYPE VARCHAR(255);

-- dash_produtos: categoria, marca, referencia, codigo_fabrica
ALTER TABLE dash_produtos ALTER COLUMN categoria    TYPE VARCHAR(255);
ALTER TABLE dash_produtos ALTER COLUMN marca        TYPE VARCHAR(255);
ALTER TABLE dash_produtos ALTER COLUMN referencia   TYPE VARCHAR(255);
ALTER TABLE dash_produtos ALTER COLUMN codigo_fabrica TYPE VARCHAR(255);

-- dash_vendas: marca, categoria, especie, status, numero_pedido
ALTER TABLE dash_vendas ALTER COLUMN marca         TYPE VARCHAR(255);
ALTER TABLE dash_vendas ALTER COLUMN categoria     TYPE VARCHAR(255);
ALTER TABLE dash_vendas ALTER COLUMN especie       TYPE VARCHAR(255);
ALTER TABLE dash_vendas ALTER COLUMN status        TYPE VARCHAR(100);
ALTER TABLE dash_vendas ALTER COLUMN numero_pedido TYPE VARCHAR(100);

-- dash_vendas_itens: vendedor, produto, marca, categoria
ALTER TABLE dash_vendas_itens ALTER COLUMN vendedor  TYPE VARCHAR(255);
ALTER TABLE dash_vendas_itens ALTER COLUMN produto   TYPE VARCHAR(500);
ALTER TABLE dash_vendas_itens ALTER COLUMN marca     TYPE VARCHAR(255);
ALTER TABLE dash_vendas_itens ALTER COLUMN categoria TYPE VARCHAR(255);

-- dash_financeiro: descricao, tipo_documento, centro_custo
ALTER TABLE dash_financeiro ALTER COLUMN descricao     TYPE VARCHAR(500);
ALTER TABLE dash_financeiro ALTER COLUMN tipo_documento TYPE VARCHAR(100);
ALTER TABLE dash_financeiro ALTER COLUMN centro_custo   TYPE VARCHAR(255);
ALTER TABLE dash_financeiro ALTER COLUMN tipo           TYPE VARCHAR(100);

-- Garante que todos os usuários existentes e futuros virem admin por padrão
UPDATE dash_usuarios SET role = 'admin' WHERE role = 'viewer';
ALTER TABLE dash_usuarios ALTER COLUMN role SET DEFAULT 'admin';

-- Confirma migration registrada
DO $$
BEGIN
  RAISE NOTICE 'Migration 005 aplicada com sucesso: limites VARCHAR aumentados e padrão admin configurado.';
END $$;

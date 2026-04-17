-- ============================================================
-- COLISEU DASH - Schema D1 (SQLite)
-- Espelho adaptado do schema PostgreSQL da especificação
-- ============================================================

-- ------------------------------------------------------------
-- TABELAS DE SINCRONIZAÇÃO (mirror do Firebird)
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS sync_metadata (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tabela TEXT NOT NULL,
  ultima_sincronizacao TEXT,
  registros_sincronizados INTEGER DEFAULT 0,
  status TEXT DEFAULT 'OK',
  erro_mensagem TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_sync_metadata_tabela ON sync_metadata(tabela);

CREATE TABLE IF NOT EXISTS sync_clientes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  id_firebird INTEGER UNIQUE,
  nome TEXT NOT NULL,
  documento TEXT,
  email TEXT,
  telefone TEXT,
  cidade TEXT,
  estado TEXT,
  data_cadastro TEXT,
  ativo INTEGER DEFAULT 1,
  sincronizado_em TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_sync_clientes_nome ON sync_clientes(nome);
CREATE INDEX IF NOT EXISTS idx_sync_clientes_documento ON sync_clientes(documento);

CREATE TABLE IF NOT EXISTS sync_produtos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  id_firebird INTEGER UNIQUE,
  codigo TEXT,
  nome TEXT NOT NULL,
  descricao TEXT,
  categoria TEXT,
  preco REAL NOT NULL DEFAULT 0,
  custo REAL NOT NULL DEFAULT 0,
  estoque REAL NOT NULL DEFAULT 0,
  estoque_minimo REAL DEFAULT 0,
  ativo INTEGER DEFAULT 1,
  sincronizado_em TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_sync_produtos_nome ON sync_produtos(nome);
CREATE INDEX IF NOT EXISTS idx_sync_produtos_categoria ON sync_produtos(categoria);

CREATE TABLE IF NOT EXISTS sync_vendedores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  id_firebird INTEGER UNIQUE,
  nome TEXT NOT NULL,
  email TEXT,
  ativo INTEGER DEFAULT 1,
  sincronizado_em TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sync_fornecedores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  id_firebird INTEGER UNIQUE,
  nome TEXT NOT NULL,
  documento TEXT,
  cidade TEXT,
  estado TEXT,
  sincronizado_em TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sync_vendas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  id_firebird INTEGER UNIQUE,
  numero_pedido TEXT,
  data_venda TEXT NOT NULL,
  cliente_id INTEGER,
  vendedor_id INTEGER,
  valor_total REAL NOT NULL DEFAULT 0,
  valor_custo REAL NOT NULL DEFAULT 0,
  valor_desconto REAL DEFAULT 0,
  status TEXT DEFAULT 'FINALIZADO',
  sincronizado_em TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (cliente_id) REFERENCES sync_clientes(id),
  FOREIGN KEY (vendedor_id) REFERENCES sync_vendedores(id)
);
CREATE INDEX IF NOT EXISTS idx_sync_vendas_data ON sync_vendas(data_venda);
CREATE INDEX IF NOT EXISTS idx_sync_vendas_status ON sync_vendas(status);
CREATE INDEX IF NOT EXISTS idx_sync_vendas_vendedor ON sync_vendas(vendedor_id);
CREATE INDEX IF NOT EXISTS idx_sync_vendas_cliente ON sync_vendas(cliente_id);

CREATE TABLE IF NOT EXISTS sync_vendas_itens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  id_firebird INTEGER UNIQUE,
  venda_id INTEGER NOT NULL,
  produto_id INTEGER NOT NULL,
  quantidade REAL NOT NULL DEFAULT 1,
  preco_unitario REAL NOT NULL DEFAULT 0,
  custo_unitario REAL NOT NULL DEFAULT 0,
  valor_total REAL NOT NULL DEFAULT 0,
  sincronizado_em TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (venda_id) REFERENCES sync_vendas(id),
  FOREIGN KEY (produto_id) REFERENCES sync_produtos(id)
);
CREATE INDEX IF NOT EXISTS idx_sync_vendas_itens_venda ON sync_vendas_itens(venda_id);
CREATE INDEX IF NOT EXISTS idx_sync_vendas_itens_produto ON sync_vendas_itens(produto_id);

CREATE TABLE IF NOT EXISTS sync_comissoes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  id_firebird INTEGER UNIQUE,
  vendedor_id INTEGER NOT NULL,
  venda_id INTEGER,
  periodo TEXT,
  valor_vendas REAL DEFAULT 0,
  percentual REAL DEFAULT 0,
  valor_comissao REAL DEFAULT 0,
  data_referencia TEXT,
  sincronizado_em TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (vendedor_id) REFERENCES sync_vendedores(id)
);
CREATE INDEX IF NOT EXISTS idx_sync_comissoes_vendedor ON sync_comissoes(vendedor_id);
CREATE INDEX IF NOT EXISTS idx_sync_comissoes_data ON sync_comissoes(data_referencia);

CREATE TABLE IF NOT EXISTS sync_financeiro (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  id_firebird INTEGER UNIQUE,
  tipo TEXT NOT NULL, -- 'RECEBER' ou 'PAGAR'
  descricao TEXT,
  cliente_id INTEGER,
  fornecedor_id INTEGER,
  data_emissao TEXT,
  data_vencimento TEXT NOT NULL,
  data_pagamento TEXT,
  valor REAL NOT NULL DEFAULT 0,
  valor_pago REAL DEFAULT 0,
  status_pagamento TEXT DEFAULT 'ABERTO', -- ABERTO, PAGO, CANCELADO
  sincronizado_em TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_sync_financeiro_tipo ON sync_financeiro(tipo);
CREATE INDEX IF NOT EXISTS idx_sync_financeiro_status ON sync_financeiro(status_pagamento);
CREATE INDEX IF NOT EXISTS idx_sync_financeiro_venc ON sync_financeiro(data_vencimento);

CREATE TABLE IF NOT EXISTS sync_compras (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  id_firebird INTEGER UNIQUE,
  numero_pedido TEXT,
  fornecedor_id INTEGER NOT NULL,
  data_pedido TEXT NOT NULL,
  data_entrega TEXT,
  valor_total REAL NOT NULL DEFAULT 0,
  status TEXT DEFAULT 'FINALIZADO',
  sincronizado_em TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (fornecedor_id) REFERENCES sync_fornecedores(id)
);
CREATE INDEX IF NOT EXISTS idx_sync_compras_data ON sync_compras(data_pedido);
CREATE INDEX IF NOT EXISTS idx_sync_compras_fornecedor ON sync_compras(fornecedor_id);

CREATE TABLE IF NOT EXISTS sync_devolucoes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  id_firebird INTEGER UNIQUE,
  venda_id INTEGER,
  produto_id INTEGER,
  data_devolucao TEXT NOT NULL,
  motivo TEXT,
  quantidade REAL DEFAULT 1,
  valor REAL NOT NULL DEFAULT 0,
  sincronizado_em TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (venda_id) REFERENCES sync_vendas(id),
  FOREIGN KEY (produto_id) REFERENCES sync_produtos(id)
);
CREATE INDEX IF NOT EXISTS idx_sync_devolucoes_data ON sync_devolucoes(data_devolucao);
CREATE INDEX IF NOT EXISTS idx_sync_devolucoes_motivo ON sync_devolucoes(motivo);

CREATE TABLE IF NOT EXISTS sync_log_atividades (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  id_firebird INTEGER UNIQUE,
  usuario TEXT NOT NULL,
  operacao TEXT NOT NULL, -- INSERT, UPDATE, DELETE, SELECT, LOGIN
  tabela TEXT,
  descricao TEXT,
  data_operacao TEXT NOT NULL,
  sincronizado_em TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_sync_log_data ON sync_log_atividades(data_operacao);
CREATE INDEX IF NOT EXISTS idx_sync_log_usuario ON sync_log_atividades(usuario);
CREATE INDEX IF NOT EXISTS idx_sync_log_operacao ON sync_log_atividades(operacao);

-- ------------------------------------------------------------
-- SISTEMA WEB (usuários, sessões, auditoria, cache)
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS usuarios_web (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  senha_hash TEXT,
  nome TEXT NOT NULL,
  role TEXT DEFAULT 'viewer', -- admin, gerente, vendedor, viewer
  ativo INTEGER DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sessoes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  usuario_id INTEGER NOT NULL,
  token_jwt TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  criada_em TEXT DEFAULT CURRENT_TIMESTAMP,
  expira_em TEXT,
  ativa INTEGER DEFAULT 1,
  FOREIGN KEY (usuario_id) REFERENCES usuarios_web(id)
);
CREATE INDEX IF NOT EXISTS idx_sessoes_usuario ON sessoes(usuario_id);
CREATE INDEX IF NOT EXISTS idx_sessoes_token ON sessoes(token_jwt);

CREATE TABLE IF NOT EXISTS auditoria (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  usuario_id INTEGER,
  acao TEXT NOT NULL,
  tabela TEXT,
  registro_id INTEGER,
  dados_antigos TEXT, -- JSON
  dados_novos TEXT,   -- JSON
  ip_address TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_auditoria_usuario ON auditoria(usuario_id);
CREATE INDEX IF NOT EXISTS idx_auditoria_data ON auditoria(created_at);

CREATE TABLE IF NOT EXISTS cache_queries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  chave TEXT UNIQUE NOT NULL,
  dados TEXT NOT NULL, -- JSON
  expira_em TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_cache_chave ON cache_queries(chave);

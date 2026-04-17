import { Hono } from 'hono'
import { syncApiKeyMiddleware } from '../lib/middleware'
import type { Bindings, Variables } from '../lib/types'

const sync = new Hono<{ Bindings: Bindings; Variables: Variables }>()

// Tabelas aceitas pelo endpoint de ingestão
const TABELAS_VALIDAS = new Set([
  'sync_clientes',
  'sync_produtos',
  'sync_vendedores',
  'sync_fornecedores',
  'sync_vendas',
  'sync_vendas_itens',
  'sync_comissoes',
  'sync_financeiro',
  'sync_compras',
  'sync_devolucoes',
  'sync_log_atividades',
])

// Colunas permitidas por tabela (segurança: evita SQL injection via nome de coluna)
const COLUNAS: Record<string, string[]> = {
  sync_clientes: ['id_firebird','nome','documento','email','telefone','cidade','estado','data_cadastro','ativo'],
  sync_produtos: ['id_firebird','codigo','nome','descricao','categoria','preco','custo','estoque','estoque_minimo','ativo'],
  sync_vendedores: ['id_firebird','nome','email','ativo'],
  sync_fornecedores: ['id_firebird','nome','documento','cidade','estado'],
  sync_vendas: ['id_firebird','numero_pedido','data_venda','cliente_id','vendedor_id','valor_total','valor_custo','valor_desconto','status'],
  sync_vendas_itens: ['id_firebird','venda_id','produto_id','quantidade','preco_unitario','custo_unitario','valor_total'],
  sync_comissoes: ['id_firebird','vendedor_id','venda_id','periodo','valor_vendas','percentual','valor_comissao','data_referencia'],
  sync_financeiro: ['id_firebird','tipo','descricao','cliente_id','fornecedor_id','data_emissao','data_vencimento','data_pagamento','valor','valor_pago','status_pagamento'],
  sync_compras: ['id_firebird','numero_pedido','fornecedor_id','data_pedido','data_entrega','valor_total','status'],
  sync_devolucoes: ['id_firebird','venda_id','produto_id','data_devolucao','motivo','quantidade','valor'],
  sync_log_atividades: ['id_firebird','usuario','operacao','tabela','descricao','data_operacao'],
}

// POST /api/sync/ingest - recebe batch do agente Python local
// Body: { tabela: 'sync_vendas', rows: [...], mode: 'upsert' | 'truncate' }
sync.post('/ingest', syncApiKeyMiddleware, async (c) => {
  const body = await c.req.json().catch(() => null) as
    | { tabela?: string; rows?: Record<string, unknown>[]; mode?: 'upsert' | 'truncate' }
    | null
  if (!body || !body.tabela || !Array.isArray(body.rows)) {
    return c.json({ error: 'Payload inválido' }, 400)
  }
  if (!TABELAS_VALIDAS.has(body.tabela)) {
    return c.json({ error: `Tabela desconhecida: ${body.tabela}` }, 400)
  }
  const tabela = body.tabela
  const cols = COLUNAS[tabela]
  const rows = body.rows

  let inseridos = 0
  let atualizados = 0
  const erros: string[] = []

  if (body.mode === 'truncate') {
    await c.env.DB.prepare(`DELETE FROM ${tabela}`).run()
  }

  for (const r of rows) {
    try {
      const usedCols = cols.filter((c) => Object.prototype.hasOwnProperty.call(r, c))
      if (usedCols.length === 0) continue
      const placeholders = usedCols.map(() => '?').join(', ')
      const values = usedCols.map((cl) => r[cl] ?? null)

      // UPSERT por id_firebird
      const sql = `
        INSERT INTO ${tabela} (${usedCols.join(', ')}, sincronizado_em)
        VALUES (${placeholders}, CURRENT_TIMESTAMP)
        ON CONFLICT(id_firebird) DO UPDATE SET
          ${usedCols.filter(c => c !== 'id_firebird').map(c => `${c} = excluded.${c}`).join(', ')},
          sincronizado_em = CURRENT_TIMESTAMP
      `
      const res = await c.env.DB.prepare(sql).bind(...values).run()
      if (res.meta.changes) inseridos += res.meta.changes
    } catch (e: any) {
      erros.push(String(e?.message || e))
    }
  }

  // Atualiza metadata
  await c.env.DB.prepare(
    `INSERT INTO sync_metadata (tabela, ultima_sincronizacao, registros_sincronizados, status, erro_mensagem)
     VALUES (?, CURRENT_TIMESTAMP, ?, ?, ?)`
  ).bind(
    tabela,
    rows.length,
    erros.length ? 'PARCIAL' : 'OK',
    erros.length ? erros.slice(0, 5).join(' | ') : null
  ).run().catch(() => {})

  return c.json({
    tabela,
    recebidos: rows.length,
    aplicados: inseridos,
    erros: erros.length,
    detalhes_erros: erros.slice(0, 5),
  })
})

// GET /api/sync/status - último status de cada tabela
sync.get('/status', async (c) => {
  const { results } = await c.env.DB.prepare(
    `SELECT tabela, MAX(ultima_sincronizacao) AS ultima,
            (SELECT status FROM sync_metadata m2
              WHERE m2.tabela = sync_metadata.tabela
              ORDER BY id DESC LIMIT 1) AS status,
            (SELECT registros_sincronizados FROM sync_metadata m3
              WHERE m3.tabela = sync_metadata.tabela
              ORDER BY id DESC LIMIT 1) AS registros
       FROM sync_metadata
      GROUP BY tabela
      ORDER BY tabela`
  ).all()
  return c.json({ status: results, timestamp: new Date().toISOString() })
})

// GET /api/sync/metadata
sync.get('/metadata', async (c) => {
  const { results } = await c.env.DB.prepare(
    'SELECT * FROM sync_metadata ORDER BY created_at DESC LIMIT 100'
  ).all()
  return c.json({ metadata: results })
})

// GET /api/sync/log
sync.get('/log', async (c) => {
  const limit = Number(c.req.query('limit') || 100)
  const { results } = await c.env.DB.prepare(
    'SELECT * FROM sync_metadata ORDER BY created_at DESC LIMIT ?'
  ).bind(limit).all()
  return c.json({ log: results })
})

// POST /api/sync/start - Sinaliza ao frontend que foi solicitada sincronização
// (o agente Python decide o polling; aqui só registramos o pedido)
sync.post('/start', async (c) => {
  await c.env.DB.prepare(
    `INSERT INTO sync_metadata (tabela, ultima_sincronizacao, status, erro_mensagem)
     VALUES ('__request__', CURRENT_TIMESTAMP, 'SOLICITADA', NULL)`
  ).run().catch(() => {})
  return c.json({ ok: true, message: 'Solicitação de sincronização registrada' })
})

export default sync

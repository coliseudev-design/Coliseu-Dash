'use strict';

const express = require('express');
const router = express.Router();
const db = require('../db/postgres');
const { getPeriodRange } = require('../utils/period');

/**
 * Busca documento normalizado (somente dígitos) da filial selecionada, se houver.
 */
async function resolveFilialDoc(tenantId, deptoId) {
    if (!deptoId || deptoId === 'todas' || deptoId === 'all') return null;
    const num = parseInt(deptoId, 10);
    if (isNaN(num)) return null;

    const { rows } = await db.query(
        `SELECT regexp_replace(COALESCE(documento, ''), '\\D', '', 'g') AS doc
         FROM dash_filiais
         WHERE tenant_id = $1 AND depto_id = $2
         LIMIT 1`,
        [tenantId, num]
    );
    const doc = rows[0]?.doc || '';
    return doc.length >= 11 ? doc : null;
}

/**
 * Constrói CTE SQL unificada dos Documentos Fiscais / Faturados (Emitidas / Saída + Entrada)
 * combinando XMLs completos de `dash_cargas` + documentos de saída/entrada em `dash_vendas` sem duplicar.
 */
function buildFiscalUnifiedCte({
    startDateOnly,
    endDateOnly,
    startTs,
    endTs,
    deptoId,
    filialDoc,
    cfop,
    search,
    tipo,
    apenasNfe = false,
}) {
    const params = [];
    const pushParam = (val) => {
        params.push(val);
        return `$${params.length}`;
    };

    const pTenant = pushParam(null); // $1 preenchido pelo chamador
    const pStartDate = pushParam(startDateOnly);
    const pEndDate = pushParam(endDateOnly);
    const pStartTs = pushParam(startTs);
    const pEndTs = pushParam(endTs);

    const isEntradaExpr = `(v.es = 2 OR COALESCE(c.tipo, '1') = '2' OR (v.cfop IS NOT NULL AND v.cfop >= 1000 AND v.cfop < 4000))`;
    const vendaDateExpr = `CASE WHEN ${isEntradaExpr} THEN COALESCE(v.data_hora_proc, v.data_venda) ELSE COALESCE(v.data_hora_proc, v.data_vencimento, v.data_venda) END`;

    let cargasDeptoClause = '';
    let vendasDeptoClause = '';
    if (deptoId && deptoId !== 'todas' && deptoId !== 'all' && !isNaN(parseInt(deptoId, 10))) {
        const pDepto = pushParam(parseInt(deptoId, 10));
        vendasDeptoClause = ` AND v.depto_id = ${pDepto}`;
        if (filialDoc) {
            const pDoc = pushParam(filialDoc);
            cargasDeptoClause = ` AND (
                CASE
                    WHEN UPPER(COALESCE(cg.dados_nfe->>'tipo_operacao', 'SAIDA')) = 'ENTRADA'
                    THEN regexp_replace(COALESCE(cg.destinatario_documento, ''), '\\D', '', 'g') = ${pDoc}
                    ELSE regexp_replace(COALESCE(cg.remetente_documento, ''), '\\D', '', 'g') = ${pDoc}
                END
                OR EXISTS (
                    SELECT 1 FROM dash_vendas vx
                    WHERE vx.tenant_id = cg.tenant_id
                      AND vx.depto_id = ${pDepto}
                      AND (
                          (cg.chave_acesso IS NOT NULL AND cg.chave_acesso <> '' AND vx.chave_nfe = cg.chave_acesso)
                          OR ((cg.dados_nfe->>'id_pedido') = vx.id_firebird::text)
                      )
                )
            )`;
        } else {
            cargasDeptoClause = ` AND (
                (cg.dados_nfe->>'id_pedido') IS NULL
                OR EXISTS (
                    SELECT 1 FROM dash_vendas vx
                    WHERE vx.tenant_id = cg.tenant_id
                      AND vx.depto_id = ${pDepto}
                      AND ((cg.dados_nfe->>'id_pedido') = vx.id_firebird::text)
                )
            )`;
        }
    }

    let cargasTipoClause = '';
    let vendasTipoClause = '';
    if (tipo === 'SAIDA') {
        cargasTipoClause = ` AND UPPER(COALESCE(cg.dados_nfe->>'tipo_operacao', 'SAIDA')) <> 'ENTRADA'`;
        vendasTipoClause = ` AND NOT ${isEntradaExpr}`;
    } else if (tipo === 'ENTRADA') {
        cargasTipoClause = ` AND UPPER(COALESCE(cg.dados_nfe->>'tipo_operacao', 'SAIDA')) = 'ENTRADA'`;
        vendasTipoClause = ` AND ${isEntradaExpr}`;
    }

    const vendasOnlyNfeClause = apenasNfe
        ? ` AND (
            (v.numero_nota IS NOT NULL AND v.numero_nota > 0)
            OR (v.chave_nfe IS NOT NULL AND TRIM(v.chave_nfe) <> '')
            OR EXISTS (
                SELECT 1 FROM dash_vendas_itens vi_nf
                WHERE vi_nf.tenant_id = v.tenant_id
                  AND vi_nf.venda_id_firebird = v.id_firebird
                  AND (
                      (vi_nf.numero_nota IS NOT NULL AND TRIM(vi_nf.numero_nota::text) NOT IN ('', '0'))
                      OR (vi_nf.chave_nfe IS NOT NULL AND TRIM(vi_nf.chave_nfe) <> '')
                  )
            )
        )`
        : '';

    let outerFilter = 'WHERE 1=1';
    if (cfop && String(cfop).trim() !== '' && cfop !== 'todos' && cfop !== 'todas') {
        const cleanCfop = String(cfop).replace(/\D/g, '');
        if (cleanCfop) {
            const pCfop = pushParam(cleanCfop);
            outerFilter += ` AND (
                nf.cfop = ${pCfop}
                OR (
                    nf.origem = 'vendas'
                    AND EXISTS (
                        SELECT 1 FROM dash_vendas_itens vi_cf
                        WHERE vi_cf.tenant_id = ${pTenant}
                          AND vi_cf.venda_id_firebird = nf.registro_id
                          AND regexp_replace(COALESCE(vi_cf.cfop, ''), '\\D', '', 'g') = ${pCfop}
                    )
                )
            )`;
        }
    }

    if (search && String(search).trim() !== '') {
        const rawSearch = String(search).trim();
        const pSearch = pushParam(`%${rawSearch}%`);
        outerFilter += ` AND (
            nf.numero_nota ILIKE ${pSearch}
            OR COALESCE(nf.chave_nfe, '') ILIKE ${pSearch}
            OR nf.parceiro_nome ILIKE ${pSearch}
            OR nf.parceiro_documento ILIKE ${pSearch}
            OR nf.numero_pedido ILIKE ${pSearch}
            OR nf.cidade ILIKE ${pSearch}
        )`;
    }

    const cteSql = `
        WITH notas_base AS (
            SELECT
                'cargas'::text AS origem,
                cg.id::bigint AS registro_id,
                CASE
                    WHEN UPPER(COALESCE(cg.dados_nfe->>'tipo_operacao', 'SAIDA')) = 'ENTRADA' THEN 'ENTRADA'
                    ELSE 'SAIDA'
                END AS tipo_operacao,
                'NF-e (XML)'::text AS modelo_doc,
                COALESCE(NULLIF(TRIM(cg.numero), ''), NULLIF(TRIM(cg.dados_nfe->>'numero_nota'), ''), '-')::text AS numero_nota,
                COALESCE(NULLIF(TRIM(cg.serie), ''), NULLIF(TRIM(cg.dados_nfe->>'serie'), ''), '1')::text AS serie,
                COALESCE(NULLIF(TRIM(cg.dados_nfe->>'id_pedido'), ''), '-')::text AS numero_pedido,
                COALESCE(NULLIF(TRIM(cg.chave_acesso), ''), NULLIF(TRIM(cg.dados_nfe->>'chave_nfe'), ''))::text AS chave_nfe,
                cg.data_emissao::timestamptz AS data_emissao,
                CASE
                    WHEN UPPER(COALESCE(cg.dados_nfe->>'tipo_operacao', 'SAIDA')) = 'ENTRADA'
                    THEN COALESCE(NULLIF(TRIM(cg.remetente_nome), ''), 'Fornecedor não informado')
                    ELSE COALESCE(NULLIF(TRIM(cg.destinatario_nome), ''), 'Consumidor Final')
                END::text AS parceiro_nome,
                CASE
                    WHEN UPPER(COALESCE(cg.dados_nfe->>'tipo_operacao', 'SAIDA')) = 'ENTRADA'
                    THEN COALESCE(NULLIF(TRIM(cg.remetente_documento), ''), '')
                    ELSE COALESCE(NULLIF(TRIM(cg.destinatario_documento), ''), '')
                END::text AS parceiro_documento,
                CASE
                    WHEN UPPER(COALESCE(cg.dados_nfe->>'tipo_operacao', 'SAIDA')) = 'ENTRADA'
                    THEN COALESCE(NULLIF(TRIM(cg.remetente_municipio), ''), '')
                    ELSE COALESCE(NULLIF(TRIM(cg.destinatario_municipio), ''), '')
                END::text AS cidade,
                CASE
                    WHEN UPPER(COALESCE(cg.dados_nfe->>'tipo_operacao', 'SAIDA')) = 'ENTRADA'
                    THEN COALESCE(NULLIF(TRIM(cg.remetente_uf), ''), '')
                    ELSE COALESCE(NULLIF(TRIM(cg.destinatario_uf), ''), '')
                END::text AS uf,
                COALESCE(NULLIF(TRIM(cg.dados_nfe->'itens'->0->>'cfop'), ''), '')::text AS cfop,
                COALESCE(
                    NULLIF(TRIM(cg.dados_nfe->>'natureza_operacao'), ''),
                    CASE
                        WHEN UPPER(COALESCE(cg.dados_nfe->>'tipo_operacao', 'SAIDA')) = 'ENTRADA'
                        THEN 'Entrada de Mercadoria'
                        ELSE 'Saída / Venda de Mercadoria'
                    END
                )::text AS natureza_operacao,
                COALESCE(cg.valor_total, 0)::numeric(15,2) AS valor_total,
                COALESCE(NULLIF(TRIM(cg.status), ''), 'AUTORIZADA')::text AS status,
                COALESCE(
                    CASE WHEN (cg.dados_nfe->>'qtd_itens') ~ '^[0-9]+$' THEN (cg.dados_nfe->>'qtd_itens')::int ELSE NULL END,
                    CASE WHEN jsonb_typeof(cg.dados_nfe->'itens') = 'array' THEN jsonb_array_length(cg.dados_nfe->'itens') ELSE 0 END
                )::int AS qtd_itens
            FROM dash_cargas cg
            WHERE cg.tenant_id = ${pTenant}
              AND COALESCE(cg.tipo_documento, 'NFE') = 'NFE'
              AND cg.data_emissao >= ${pStartDate}::date
              AND cg.data_emissao <= ${pEndDate}::date
              AND UPPER(TRIM(COALESCE(cg.status, ''))) NOT IN ('CANCELADA', 'CANCELADO', 'DENEGADA', 'INUTILIZADA')
              ${cargasTipoClause}
              ${cargasDeptoClause}

            UNION ALL

            SELECT
                'vendas'::text AS origem,
                v.id_firebird::bigint AS registro_id,
                CASE
                    WHEN ${isEntradaExpr} THEN 'ENTRADA'
                    ELSE 'SAIDA'
                END AS tipo_operacao,
                CASE
                    WHEN (v.chave_nfe IS NOT NULL AND LENGTH(TRIM(v.chave_nfe)) >= 40)
                         OR (v.numero_nota IS NOT NULL AND v.numero_nota > 0)
                    THEN 'NF-e / NFC-e'
                    WHEN ${isEntradaExpr} THEN 'Entrada ERP'
                    ELSE 'Faturado ERP'
                END::text AS modelo_doc,
                COALESCE(NULLIF(v.numero_nota, 0)::text, NULLIF(TRIM(v.numero_pedido), ''), v.id_firebird::text) AS numero_nota,
                '1'::text AS serie,
                COALESCE(NULLIF(TRIM(v.numero_pedido), ''), v.id_firebird::text) AS numero_pedido,
                NULLIF(TRIM(v.chave_nfe), '')::text AS chave_nfe,
                (${vendaDateExpr})::timestamptz AS data_emissao,
                COALESCE(
                    NULLIF(TRIM(c.nome), ''),
                    CASE
                        WHEN ${isEntradaExpr}
                        THEN 'Fornecedor #' || COALESCE(v.cliente_id_firebird::text, '-')
                        ELSE 'Consumidor Final'
                    END
                )::text AS parceiro_nome,
                COALESCE(NULLIF(TRIM(c.documento), ''), '')::text AS parceiro_documento,
                COALESCE(NULLIF(TRIM(c.cidade), ''), '')::text AS cidade,
                COALESCE(NULLIF(TRIM(c.estado), ''), '')::text AS uf,
                COALESCE(NULLIF(v.cfop, 0)::text, '')::text AS cfop,
                COALESCE(
                    NULLIF(TRIM(v.especie), ''),
                    CASE
                        WHEN ${isEntradaExpr}
                        THEN 'Nota de Entrada'
                        ELSE 'Venda Faturada'
                    END
                )::text AS natureza_operacao,
                ABS(COALESCE(v.valor_total - COALESCE(v.valor_desconto, 0), 0))::numeric(15,2) AS valor_total,
                COALESCE(NULLIF(TRIM(v.status), ''), CASE WHEN ${isEntradaExpr} THEN 'RECEBIDA' ELSE 'FATURADO' END)::text AS status,
                0::int AS qtd_itens
            FROM dash_vendas v
            LEFT JOIN dash_clientes c ON c.tenant_id = v.tenant_id AND c.id_firebird = v.cliente_id_firebird
            WHERE v.tenant_id = ${pTenant}
              AND (${vendaDateExpr}) >= ${pStartTs}
              AND (${vendaDateExpr}) <= ${pEndTs}
              AND UPPER(TRIM(COALESCE(v.status, ''))) NOT IN ('CANCELADO', 'CANCELADA', 'ABERTO', 'PENDENTE', 'ORÇAMENTO', 'ORCAMENTO', 'NULO', 'TESTE')
              AND COALESCE(v.status, '') NOT ILIKE '%TRANSF%'
              AND (v.especie IS NULL OR v.especie NOT ILIKE '%TRANSF%')
              AND (
                  ${isEntradaExpr}
                  OR (
                      UPPER(TRIM(COALESCE(v.status, ''))) IN ('FATURADO', 'FINALIZADO', 'PROCESSADO')
                      AND (
                          v.especie IS NULL
                          OR v.especie NOT ILIKE '%SEM PAGAMENTO%'
                          OR EXISTS (
                              SELECT 1 FROM dash_vendas_itens vi_sp
                              WHERE vi_sp.venda_id_firebird = v.id_firebird AND vi_sp.tenant_id = v.tenant_id
                          )
                      )
                      AND (
                          (v.numero_nota IS NOT NULL AND v.numero_nota > 0)
                          OR (v.chave_nfe IS NOT NULL AND TRIM(v.chave_nfe) <> '')
                          OR EXISTS (
                              SELECT 1 FROM dash_vendas_itens vi_ex
                              WHERE vi_ex.venda_id_firebird = v.id_firebird AND vi_ex.tenant_id = v.tenant_id
                          )
                          OR v.data_venda >= (CURRENT_DATE - INTERVAL '30 days')
                      )
                  )
              )
              ${vendasOnlyNfeClause}
              ${vendasTipoClause}
              ${vendasDeptoClause}
              AND NOT EXISTS (
                  SELECT 1 FROM dash_cargas cg_dup
                  WHERE cg_dup.tenant_id = v.tenant_id
                    AND (
                        (v.chave_nfe IS NOT NULL AND v.chave_nfe <> '' AND cg_dup.chave_acesso = v.chave_nfe)
                        OR ((cg_dup.dados_nfe->>'id_pedido') = v.id_firebird::text)
                    )
              )
        ),
        notas_filtradas AS (
            SELECT * FROM notas_base nf
            ${outerFilter}
        )
    `;

    return { cteSql, params };
}

function parseApenasNfe(val) {
    if (val === undefined || val === null) return false;
    const s = String(val).trim().toLowerCase();
    return s === 'true' || s === '1' || s === 'sim';
}

/**
 * GET /api/fiscal/resumo
 * Retorna KPIs consolidados de Notas Emitidas (Saída) e Notas de Entrada, CFOPs disponíveis e evolução no período.
 */
router.get('/resumo', async (req, res, next) => {
    try {
        const tenantId = req.tenant.id;
        const period = req.query.period || 'thisMonth';
        const { start_date, end_date, depto_id, cfop, search, apenas_nfe } = req.query;
        const apenasNfe = parseApenasNfe(apenas_nfe);

        const store = db.dbContext.getStore();
        const tzOffset = store ? store.tzOffset : -180;
        const anchorDate = new Date(Date.now() + (tzOffset * 60 * 1000));
        const { start, end } = getPeriodRange(period, start_date, end_date, anchorDate);

        const startDateOnly = start.slice(0, 10);
        const endDateOnly = end.slice(0, 10);
        const filialDoc = await resolveFilialDoc(tenantId, depto_id);

        const { cteSql, params } = buildFiscalUnifiedCte({
            startDateOnly,
            endDateOnly,
            startTs: start,
            endTs: end,
            deptoId: depto_id,
            filialDoc,
            cfop,
            search,
            tipo: null,
            apenasNfe,
        });
        params[0] = tenantId;

        const [kpiRes, cfopListRes, evolucaoRes] = await Promise.all([
            db.query(`
                ${cteSql}
                SELECT
                    COUNT(*) FILTER (WHERE tipo_operacao = 'SAIDA') AS emitidas_qtd,
                    COALESCE(SUM(valor_total) FILTER (WHERE tipo_operacao = 'SAIDA'), 0) AS emitidas_valor,
                    COUNT(*) FILTER (
                        WHERE tipo_operacao = 'SAIDA'
                          AND (origem = 'cargas' OR modelo_doc = 'NF-e / NFC-e' OR (chave_nfe IS NOT NULL AND chave_nfe <> ''))
                    ) AS emitidas_chave_qtd,
                    COUNT(*) FILTER (WHERE tipo_operacao = 'ENTRADA') AS entradas_qtd,
                    COALESCE(SUM(valor_total) FILTER (WHERE tipo_operacao = 'ENTRADA'), 0) AS entradas_valor,
                    COUNT(*) FILTER (
                        WHERE tipo_operacao = 'ENTRADA'
                          AND (origem = 'cargas' OR modelo_doc = 'NF-e / NFC-e' OR (chave_nfe IS NOT NULL AND chave_nfe <> ''))
                    ) AS entradas_chave_qtd
                FROM notas_filtradas
            `, params),
            db.query(`
                ${cteSql}
                SELECT
                    cfop,
                    tipo_operacao,
                    COUNT(*) AS qtd,
                    COALESCE(SUM(valor_total), 0) AS valor
                FROM notas_filtradas
                WHERE cfop IS NOT NULL AND cfop <> ''
                GROUP BY cfop, tipo_operacao
                ORDER BY valor DESC
                LIMIT 20
            `, params),
            db.query(`
                ${cteSql}
                SELECT
                    TO_CHAR(data_emissao, 'YYYY-MM-DD') AS data,
                    COALESCE(SUM(valor_total) FILTER (WHERE tipo_operacao = 'SAIDA'), 0) AS valor_saida,
                    COUNT(*) FILTER (WHERE tipo_operacao = 'SAIDA') AS qtd_saida,
                    COALESCE(SUM(valor_total) FILTER (WHERE tipo_operacao = 'ENTRADA'), 0) AS valor_entrada,
                    COUNT(*) FILTER (WHERE tipo_operacao = 'ENTRADA') AS qtd_entrada
                FROM notas_filtradas
                GROUP BY 1
                ORDER BY 1 ASC
            `, params),
        ]);

        let cfopRows = cfopListRes.rows;
        if (cfopRows.length === 0) {
            const fallbackCfopRes = await db.query(
                `SELECT
                    regexp_replace(TRIM(vi.cfop), '\\D', '', 'g') AS cfop,
                    CASE
                        WHEN regexp_replace(TRIM(vi.cfop), '\\D', '', 'g') ~ '^[123]' THEN 'ENTRADA'
                        ELSE 'SAIDA'
                    END AS tipo_operacao,
                    COUNT(DISTINCT vi.venda_id_firebird) AS qtd,
                    COALESCE(SUM(vi.valor_total), 0) AS valor
                 FROM dash_vendas_itens vi
                 JOIN dash_vendas v ON v.tenant_id = vi.tenant_id AND v.id_firebird = vi.venda_id_firebird
                 WHERE vi.tenant_id = $1
                   AND vi.cfop IS NOT NULL AND TRIM(vi.cfop) <> '' AND TRIM(vi.cfop) <> '0'
                   AND COALESCE(v.data_hora_proc, v.data_vencimento, v.data_venda) >= $2
                   AND COALESCE(v.data_hora_proc, v.data_vencimento, v.data_venda) <= $3
                 GROUP BY 1, 2
                 HAVING regexp_replace(TRIM(vi.cfop), '\\D', '', 'g') <> ''
                 ORDER BY valor DESC
                 LIMIT 20`,
                [tenantId, start, end]
            ).catch(() => ({ rows: [] }));
            cfopRows = fallbackCfopRes.rows;
        }

        const k = kpiRes.rows[0] || {};
        const emitidasQtd = parseInt(k.emitidas_qtd || 0, 10);
        const emitidasValor = parseFloat(k.emitidas_valor || 0);
        const emitidasChaveQtd = parseInt(k.emitidas_chave_qtd || 0, 10);
        const entradasQtd = parseInt(k.entradas_qtd || 0, 10);
        const entradasValor = parseFloat(k.entradas_valor || 0);
        const entradasChaveQtd = parseInt(k.entradas_chave_qtd || 0, 10);

        res.json({
            period: { start, end, label: period },
            apenas_nfe: apenasNfe,
            kpis: {
                emitidas_qtd: emitidasQtd,
                emitidas_valor: emitidasValor,
                emitidas_ticket_medio: emitidasQtd > 0 ? emitidasValor / emitidasQtd : 0,
                emitidas_chave_qtd: emitidasChaveQtd,
                entradas_qtd: entradasQtd,
                entradas_valor: entradasValor,
                entradas_ticket_medio: entradasQtd > 0 ? entradasValor / entradasQtd : 0,
                entradas_chave_qtd: entradasChaveQtd,
                saldo_fiscal: emitidasValor - entradasValor,
                total_documentos: emitidasQtd + entradasQtd,
            },
            cfops: cfopRows.map((r) => ({
                cfop: r.cfop,
                tipo_operacao: r.tipo_operacao,
                qtd: parseInt(r.qtd || 0, 10),
                valor: parseFloat(r.valor || 0),
            })),
            evolucao: evolucaoRes.rows.map((r) => ({
                data: r.data,
                valor_saida: parseFloat(r.valor_saida || 0),
                qtd_saida: parseInt(r.qtd_saida || 0, 10),
                valor_entrada: parseFloat(r.valor_entrada || 0),
                qtd_entrada: parseInt(r.qtd_entrada || 0, 10),
            })),
        });
    } catch (err) {
        next(err);
    }
});

/**
 * GET /api/fiscal/notas
 * Lista paginada de Notas Fiscais Emitidas (`tipo=SAIDA`) ou Notas de Entrada (`tipo=ENTRADA`).
 */
router.get('/notas', async (req, res, next) => {
    try {
        const tenantId = req.tenant.id;
        const period = req.query.period || 'thisMonth';
        const { start_date, end_date, depto_id, cfop, search, apenas_nfe } = req.query;
        const apenasNfe = parseApenasNfe(apenas_nfe);
        const tipo = String(req.query.tipo || 'SAIDA').toUpperCase() === 'ENTRADA' ? 'ENTRADA' : 'SAIDA';
        const page = Math.max(1, parseInt(req.query.page || '1', 10));
        const limit = Math.min(200, Math.max(10, parseInt(req.query.limit || '50', 10)));
        const offset = (page - 1) * limit;

        const store = db.dbContext.getStore();
        const tzOffset = store ? store.tzOffset : -180;
        const anchorDate = new Date(Date.now() + (tzOffset * 60 * 1000));
        const { start, end } = getPeriodRange(period, start_date, end_date, anchorDate);

        const startDateOnly = start.slice(0, 10);
        const endDateOnly = end.slice(0, 10);
        const filialDoc = await resolveFilialDoc(tenantId, depto_id);

        const { cteSql, params } = buildFiscalUnifiedCte({
            startDateOnly,
            endDateOnly,
            startTs: start,
            endTs: end,
            deptoId: depto_id,
            filialDoc,
            cfop,
            search,
            tipo,
            apenasNfe,
        });
        params[0] = tenantId;

        const countRes = await db.query(
            `${cteSql}
             SELECT COUNT(*) AS total, COALESCE(SUM(valor_total), 0) AS soma_valor
             FROM notas_filtradas`,
            params
        );

        const total = parseInt(countRes.rows[0]?.total || 0, 10);
        const somaValor = parseFloat(countRes.rows[0]?.soma_valor || 0);

        const limitIdx = params.length + 1;
        const offsetIdx = params.length + 2;
        const rowsRes = await db.query(
            `${cteSql}
             SELECT *
             FROM notas_filtradas
             ORDER BY data_emissao DESC, registro_id DESC
             LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
            [...params, limit, offset]
        );

        const rows = rowsRes.rows;

        // Enriquecer qtd_itens, CFOP, numero_nota e chave_nfe a partir de dash_vendas_itens na página atual
        const vendaIds = rows.filter((r) => r.origem === 'vendas').map((r) => Number(r.registro_id));
        const vendaStatsMap = new Map();
        if (vendaIds.length > 0) {
            const statsRes = await db.query(
                `SELECT
                    venda_id_firebird,
                    COUNT(*) AS qtd_itens,
                    MAX(NULLIF(TRIM(cfop), '')) AS item_cfop,
                    MAX(NULLIF(NULLIF(TRIM(numero_nota::text), ''), '0')) AS item_numero_nota,
                    MAX(NULLIF(TRIM(chave_nfe), '')) AS item_chave_nfe
                 FROM dash_vendas_itens
                 WHERE tenant_id = $1 AND venda_id_firebird = ANY($2::int[])
                 GROUP BY venda_id_firebird`,
                [tenantId, vendaIds]
            );
            for (const st of statsRes.rows) {
                vendaStatsMap.set(Number(st.venda_id_firebird), {
                    qtd_itens: parseInt(st.qtd_itens || 0, 10),
                    cfop: st.item_cfop && st.item_cfop !== '0' ? st.item_cfop : '',
                    numero_nota: st.item_numero_nota || null,
                    chave_nfe: st.item_chave_nfe || null,
                });
            }
        }

        const data = rows.map((r) => {
            const extra = r.origem === 'vendas' ? vendaStatsMap.get(Number(r.registro_id)) : null;
            const resolvedChave = r.chave_nfe || extra?.chave_nfe || null;
            const hasHeaderNf = r.modelo_doc === 'NF-e / NFC-e';
            const resolvedNumeroNota = (hasHeaderNf || r.origem === 'cargas')
                ? r.numero_nota
                : (extra?.numero_nota || r.numero_nota);
            const resolvedModelo = r.origem === 'cargas'
                ? r.modelo_doc
                : ((hasHeaderNf || extra?.numero_nota || resolvedChave) ? 'NF-e / NFC-e' : r.modelo_doc);

            return {
                origem: r.origem,
                registro_id: Number(r.registro_id),
                tipo_operacao: r.tipo_operacao,
                modelo_doc: resolvedModelo,
                numero_nota: resolvedNumeroNota,
                serie: r.serie,
                numero_pedido: r.numero_pedido,
                chave_nfe: resolvedChave,
                data_emissao: r.data_emissao,
                parceiro_nome: r.parceiro_nome,
                parceiro_documento: r.parceiro_documento,
                cidade: r.cidade,
                uf: r.uf,
                cfop: r.cfop || extra?.cfop || '',
                natureza_operacao: r.natureza_operacao,
                valor_total: parseFloat(r.valor_total || 0),
                status: r.status,
                qtd_itens: r.origem === 'vendas' ? (extra?.qtd_itens || 0) : parseInt(r.qtd_itens || 0, 10),
            };
        });

        res.json({
            tipo,
            apenas_nfe: apenasNfe,
            total,
            soma_valor: somaValor,
            page,
            limit,
            total_pages: Math.max(1, Math.ceil(total / limit)),
            data,
        });
    } catch (err) {
        next(err);
    }
});

/**
 * GET /api/fiscal/notas/:origem/:id
 * Retorna os detalhes completos e itens da Nota Fiscal selecionada.
 */
router.get('/notas/:origem/:id', async (req, res, next) => {
    try {
        const tenantId = req.tenant.id;
        const origem = String(req.params.origem || '').toLowerCase();
        const idNum = parseInt(req.params.id, 10);

        if (isNaN(idNum) || !['cargas', 'vendas'].includes(origem)) {
            return res.status(400).json({ error: 'Identificador de nota fiscal inválido.' });
        }

        if (origem === 'cargas') {
            const { rows } = await db.query(
                `SELECT *
                 FROM dash_cargas
                 WHERE tenant_id = $1 AND id = $2
                 LIMIT 1`,
                [tenantId, idNum]
            );

            if (rows.length === 0) {
                return res.status(404).json({ error: 'Nota fiscal não encontrada.' });
            }

            const cg = rows[0];
            const nfe = cg.dados_nfe && typeof cg.dados_nfe === 'object' ? cg.dados_nfe : {};
            const isEntrada = String(nfe.tipo_operacao || 'SAIDA').toUpperCase() === 'ENTRADA';
            const rawItens = Array.isArray(nfe.itens) ? nfe.itens : [];

            const itens = rawItens.map((it, idx) => ({
                ordem: idx + 1,
                codigo: it.codigo || String(it.id_produto || idx + 1),
                descricao: it.descricao || 'Produto sem descrição',
                ncm: it.ncm || '',
                cst: it.cst || '',
                cfop: it.cfop || '',
                unidade: it.unidade || 'UN',
                quantidade: parseFloat(it.quantidade || 0),
                valor_unitario: parseFloat(it.valor_unitario || 0),
                desconto: parseFloat(it.desconto || 0),
                valor_total: parseFloat(it.valor_total || 0),
            }));

            return res.json({
                origem: 'cargas',
                registro_id: Number(cg.id),
                tipo_operacao: isEntrada ? 'ENTRADA' : 'SAIDA',
                modelo_doc: 'NF-e (XML)',
                numero_nota: cg.numero || nfe.numero_nota || '-',
                serie: cg.serie || nfe.serie || '1',
                numero_pedido: nfe.id_pedido ? String(nfe.id_pedido) : '-',
                chave_nfe: cg.chave_acesso || nfe.chave_nfe || null,
                protocolo: nfe.protocolo || null,
                natureza_operacao: nfe.natureza_operacao || (isEntrada ? 'Entrada de Mercadoria' : 'Saída / Venda de Mercadoria'),
                data_emissao: cg.data_emissao,
                status: cg.status || 'AUTORIZADA',
                valor_produtos: parseFloat(cg.valor_produtos || cg.valor_total || 0),
                valor_frete: parseFloat(nfe.valor_frete || 0),
                valor_desconto: itens.reduce((acc, i) => acc + i.desconto, 0),
                valor_total: parseFloat(cg.valor_total || 0),
                remetente: {
                    nome: cg.remetente_nome || '-',
                    documento: cg.remetente_documento || '',
                    municipio: cg.remetente_municipio || '',
                    uf: cg.remetente_uf || '',
                },
                destinatario: {
                    nome: cg.destinatario_nome || '-',
                    documento: cg.destinatario_documento || '',
                    municipio: cg.destinatario_municipio || '',
                    uf: cg.destinatario_uf || '',
                },
                transporte: {
                    transportadora_nome: nfe.transportadora_nome || null,
                    transportadora_documento: nfe.transportadora_documento || null,
                    placa: nfe.veiculo_placa || null,
                    uf: nfe.veiculo_uf || null,
                    volumes: cg.volumes || null,
                    especie: cg.especie || null,
                    peso_bruto: parseFloat(cg.peso_bruto || 0),
                    peso_liquido: parseFloat(cg.peso_liquido || 0),
                },
                itens,
            });
        }

        // origem === 'vendas'
        const { rows: vRows } = await db.query(
            `SELECT
                v.*,
                c.nome AS cliente_nome,
                c.documento AS cliente_documento,
                c.cidade AS cliente_cidade,
                c.estado AS cliente_uf,
                c.tipo AS cliente_tipo,
                vd.nome AS vendedor_nome,
                f.nome AS filial_nome,
                f.documento AS filial_documento
             FROM dash_vendas v
             LEFT JOIN dash_clientes c ON c.tenant_id = v.tenant_id AND c.id_firebird = v.cliente_id_firebird
             LEFT JOIN dash_vendedores vd ON vd.tenant_id = v.tenant_id AND vd.id_firebird = v.vendedor_id_firebird
             LEFT JOIN dash_filiais f ON f.tenant_id = v.tenant_id AND f.depto_id = v.depto_id
             WHERE v.tenant_id = $1 AND v.id_firebird = $2
             LIMIT 1`,
            [tenantId, idNum]
        );

        if (vRows.length === 0) {
            return res.status(404).json({ error: 'Nota fiscal não encontrada.' });
        }

        const v = vRows[0];
        const isEntrada = v.es === 2 || String(v.cliente_tipo || '1') === '2' || (v.cfop !== null && Number(v.cfop) >= 1000 && Number(v.cfop) < 4000);

        const { rows: itemRows } = await db.query(
            `SELECT
                vi.id,
                vi.produto_id_firebird,
                COALESCE(NULLIF(TRIM(p.codigo), ''), vi.produto_id_firebird::text) AS codigo,
                COALESCE(NULLIF(TRIM(vi.produto), ''), NULLIF(TRIM(p.nome), ''), 'Produto #' || COALESCE(vi.produto_id_firebird::text, '?')) AS descricao,
                COALESCE(NULLIF(NULLIF(TRIM(vi.cfop), ''), '0'), NULLIF(v.cfop, 0)::text, '') AS cfop,
                NULLIF(NULLIF(TRIM(vi.numero_nota::text), ''), '0') AS item_numero_nota,
                NULLIF(TRIM(vi.chave_nfe), '') AS item_chave_nfe,
                COALESCE(vi.quantidade, 0) AS quantidade,
                COALESCE(vi.preco_unitario, 0) AS valor_unitario,
                COALESCE(vi.desconto_item, 0) AS desconto_pct,
                COALESCE(vi.valor_total, 0) AS valor_total
             FROM dash_vendas_itens vi
             JOIN dash_vendas v ON v.tenant_id = vi.tenant_id AND v.id_firebird = vi.venda_id_firebird
             LEFT JOIN dash_produtos p ON p.tenant_id = vi.tenant_id AND p.id_firebird = vi.produto_id_firebird
             WHERE vi.tenant_id = $1 AND vi.venda_id_firebird = $2
             ORDER BY vi.id ASC`,
            [tenantId, idNum]
        );

        const firstItemNf = itemRows.find((i) => i.item_numero_nota)?.item_numero_nota || null;
        const firstItemChave = itemRows.find((i) => i.item_chave_nfe)?.item_chave_nfe || null;

        const itens = itemRows.map((it, idx) => {
            const bruto = parseFloat(it.valor_total || 0);
            const descPct = parseFloat(it.desconto_pct || 0);
            const descVal = descPct > 0 ? bruto * (descPct / 100) : 0;
            return {
                ordem: idx + 1,
                codigo: it.codigo || String(idx + 1),
                descricao: it.descricao,
                ncm: '',
                cst: '',
                cfop: it.cfop || '',
                unidade: 'UN',
                quantidade: parseFloat(it.quantidade || 0),
                valor_unitario: parseFloat(it.valor_unitario || 0),
                desconto: descVal,
                valor_total: bruto - descVal,
            };
        });

        const parceiroNome = v.cliente_nome || (isEntrada ? 'Fornecedor' : 'Consumidor Final');
        const empresaNome = v.filial_nome || 'Empresa Emitente';
        const resolvedChave = (v.chave_nfe && String(v.chave_nfe).trim()) || firstItemChave || null;
        const resolvedNumeroNota = (v.numero_nota && Number(v.numero_nota) > 0)
            ? String(v.numero_nota)
            : (firstItemNf || v.numero_pedido || String(v.id_firebird));
        const hasNfMetadata = Boolean((v.numero_nota && Number(v.numero_nota) > 0) || firstItemNf || resolvedChave);

        return res.json({
            origem: 'vendas',
            registro_id: Number(v.id_firebird),
            tipo_operacao: isEntrada ? 'ENTRADA' : 'SAIDA',
            modelo_doc: hasNfMetadata ? 'NF-e / NFC-e' : (isEntrada ? 'Entrada ERP' : 'Faturado ERP'),
            numero_nota: resolvedNumeroNota,
            serie: '1',
            numero_pedido: v.numero_pedido || String(v.id_firebird),
            chave_nfe: resolvedChave,
            protocolo: null,
            natureza_operacao: v.especie || (isEntrada ? 'Nota de Entrada' : 'Venda Faturada'),
            data_emissao: isEntrada ? (v.data_hora_proc || v.data_venda) : (v.data_hora_proc || v.data_vencimento || v.data_venda),
            status: v.status || (isEntrada ? 'RECEBIDA' : 'FATURADO'),
            vendedor_nome: v.vendedor_nome || null,
            valor_produtos: Math.abs(parseFloat(v.valor_total || 0)),
            valor_frete: 0,
            valor_desconto: Math.abs(parseFloat(v.valor_desconto || 0)),
            valor_total: Math.abs(parseFloat(v.valor_total || 0) - parseFloat(v.valor_desconto || 0)),
            remetente: isEntrada
                ? {
                    nome: parceiroNome,
                    documento: v.cliente_documento || '',
                    municipio: v.cliente_cidade || '',
                    uf: v.cliente_uf || '',
                }
                : {
                    nome: empresaNome,
                    documento: v.filial_documento || '',
                    municipio: '',
                    uf: '',
                },
            destinatario: isEntrada
                ? {
                    nome: empresaNome,
                    documento: v.filial_documento || '',
                    municipio: '',
                    uf: '',
                }
                : {
                    nome: parceiroNome,
                    documento: v.cliente_documento || '',
                    municipio: v.cliente_cidade || '',
                    uf: v.cliente_uf || '',
                },
            transporte: {
                transportadora_nome: null,
                transportadora_documento: null,
                placa: null,
                uf: null,
                volumes: null,
                especie: v.especie || null,
                peso_bruto: 0,
                peso_liquido: 0,
            },
            itens,
        });
    } catch (err) {
        next(err);
    }
});

module.exports = router;

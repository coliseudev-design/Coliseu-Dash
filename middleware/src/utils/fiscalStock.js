'use strict';

const db = require('../db/postgres');
const logger = require('../config/logger');

const fiscalStockCache = new Map();
const FISCAL_STOCK_TTL_MS = 60 * 1000;

/**
 * Resolve o CNPJ (14 dígitos) da filial selecionada ou da filial padrão (Matriz) do tenant.
 * @param {string} tenantId
 * @param {string|number|null} deptoId
 * @returns {Promise<string|null>}
 */
async function resolveTargetFilialDoc(tenantId, deptoId) {
    if (!tenantId) return null;

    if (deptoId && deptoId !== 'todas' && deptoId !== 'all' && !isNaN(parseInt(deptoId, 10))) {
        const { rows } = await db.query(
            `SELECT regexp_replace(COALESCE(documento, ''), '\\D', '', 'g') AS doc
             FROM dash_filiais
             WHERE tenant_id = $1 AND depto_id = $2
             LIMIT 1`,
            [tenantId, parseInt(deptoId, 10)]
        );
        const doc = rows[0]?.doc || '';
        if (doc.length >= 11) return doc;
    }

    const { rows } = await db.query(
        `SELECT regexp_replace(COALESCE(documento, ''), '\\D', '', 'g') AS doc
         FROM dash_filiais
         WHERE tenant_id = $1
           AND LENGTH(regexp_replace(COALESCE(documento, ''), '\\D', '', 'g')) >= 11
         ORDER BY is_default DESC, depto_id ASC
         LIMIT 1`,
        [tenantId]
    );
    const defaultDoc = rows[0]?.doc || '';
    return defaultDoc.length >= 11 ? defaultDoc : null;
}

/**
 * Calcula o mapa de Estoque Fiscal (id_firebird::text -> saldo_fiscal) a partir das NFs (XML) em dash_cargas,
 * espelhando fielmente o Relatório de Estoque Fiscal do ERP Coliseu.
 * @param {string} tenantId
 * @param {string|number|null} deptoId
 * @returns {Promise<{ hasFiscalStock: boolean, stockMap: Map<string, number>, targetDoc: string|null }>}
 */
async function getFiscalStockMap(tenantId, deptoId = null) {
    if (!tenantId || tenantId === '00000000-0000-0000-0000-000000000000') {
        return { hasFiscalStock: false, stockMap: new Map(), targetDoc: null };
    }

    try {
        const targetDoc = await resolveTargetFilialDoc(tenantId, deptoId);
        const cacheKey = `${tenantId}:${targetDoc || 'all'}`;
        const cached = fiscalStockCache.get(cacheKey);
        if (cached && cached.expiresAt > Date.now()) {
            return cached.data;
        }

        const docFilterSql = targetDoc
            ? `AND (
                SUBSTRING(regexp_replace(COALESCE(cg.chave_acesso, ''), '\\D', '', 'g') FROM 7 FOR 14) = $2
                OR regexp_replace(COALESCE(cg.remetente_documento, ''), '\\D', '', 'g') = $2
                OR regexp_replace(COALESCE(cg.destinatario_documento, ''), '\\D', '', 'g') = $2
            )`
            : '';

        const queryParams = targetDoc ? [tenantId, targetDoc] : [tenantId];
        const signExpr = targetDoc
            ? `CASE
                WHEN LEFT(item_cfop, 1) IN ('1', '2', '3')
                     AND (emit_key_doc = $2 OR (emit_key_doc <> $2 AND rem_doc = $2))
                THEN qtd
                WHEN LEFT(item_cfop, 1) IN ('5', '6', '7')
                     AND emit_key_doc = $2
                THEN -qtd
                ELSE 0
            END`
            : `CASE
                WHEN LEFT(item_cfop, 1) IN ('1', '2', '3') THEN qtd
                WHEN LEFT(item_cfop, 1) IN ('5', '6', '7') THEN -qtd
                ELSE 0
            END`;

        const { rows } = await db.query(
            `WITH itens AS (
                SELECT
                    COALESCE(item->>'id_produto', item->>'produto_id', item->>'codigo', item->>'cProd') AS prod_id,
                    regexp_replace(COALESCE(item->>'cfop', cg.dados_nfe->>'cfop', ''), '\\D', '', 'g') AS item_cfop,
                    COALESCE(cg.dados_nfe->>'nat_op', cg.dados_nfe->>'natureza_operacao', '') AS nat_op,
                    SUBSTRING(regexp_replace(COALESCE(cg.chave_acesso, ''), '\\D', '', 'g') FROM 7 FOR 14) AS emit_key_doc,
                    regexp_replace(COALESCE(cg.remetente_documento, ''), '\\D', '', 'g') AS rem_doc,
                    regexp_replace(COALESCE(cg.destinatario_documento, ''), '\\D', '', 'g') AS dest_doc,
                    COALESCE((item->>'quantidade')::numeric, (item->>'qCom')::numeric, 0) AS qtd
                FROM dash_cargas cg,
                jsonb_array_elements(
                    CASE WHEN jsonb_typeof(cg.dados_nfe->'itens') = 'array' THEN cg.dados_nfe->'itens' ELSE '[]'::jsonb END
                ) AS item
                WHERE cg.tenant_id = $1
                  AND UPPER(TRIM(COALESCE(cg.status, ''))) NOT IN ('CANCELADA', 'CANCELADO', 'DENEGADA', 'INUTILIZADA')
                  ${docFilterSql}
            )
            SELECT
                prod_id,
                SUM(${signExpr})::numeric(15,4) AS saldo_fiscal
            FROM itens
            WHERE prod_id IS NOT NULL
              AND prod_id <> ''
              AND item_cfop NOT IN ('1556', '2556', '1407', '2407', '1551', '2551', '1653', '2653', '5922', '6922')
              AND nat_op NOT ILIKE '%NOTAS BAIXAS%'
              AND NOT (item_cfop = '6404' AND nat_op ILIKE '%FORA DO ESTADO%')
            GROUP BY prod_id`,
            queryParams
        );

        const stockMap = new Map();
        for (const r of rows) {
            const pid = String(r.prod_id || '').trim();
            if (!pid) continue;
            const saldo = Number(r.saldo_fiscal || 0);
            stockMap.set(pid, saldo);
        }

        const result = {
            hasFiscalStock: stockMap.size > 0,
            stockMap,
            targetDoc,
        };

        fiscalStockCache.set(cacheKey, {
            data: result,
            expiresAt: Date.now() + FISCAL_STOCK_TTL_MS,
        });

        return result;
    } catch (err) {
        logger.warn('[FiscalStock] Falha ao calcular estoque fiscal por XML; mantendo estoque padrão', {
            tenantId,
            deptoId,
            error: err.message,
        });
        return { hasFiscalStock: false, stockMap: new Map(), targetDoc: null };
    }
}

module.exports = {
    getFiscalStockMap,
    resolveTargetFilialDoc,
};

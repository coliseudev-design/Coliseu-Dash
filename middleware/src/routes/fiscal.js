'use strict';

const express = require('express');
const router = express.Router();
const db = require('../db/postgres');
const { getPeriodRange } = require('../utils/period');
const { getTenantSettings, getUserSettings, fiscalResponseCache } = require('../utils/tenantSettings');

const FISCAL_CACHE_TTL_MS = 30 * 1000;
let fiscalColumnsEnsured = false;

function getFiscalCache(key) {
    if (!fiscalResponseCache) return null;
    const entry = fiscalResponseCache.get(key);
    if (entry && entry.expiresAt > Date.now()) {
        return entry.data;
    }
    if (entry) fiscalResponseCache.delete(key);
    return null;
}

function setFiscalCache(key, data) {
    if (!fiscalResponseCache) return;
    if (fiscalResponseCache.size > 300) {
        const now = Date.now();
        for (const [k, v] of fiscalResponseCache.entries()) {
            if (v.expiresAt <= now) fiscalResponseCache.delete(k);
        }
        if (fiscalResponseCache.size > 300) {
            const firstKey = fiscalResponseCache.keys().next().value;
            if (firstKey) fiscalResponseCache.delete(firstKey);
        }
    }
    fiscalResponseCache.set(key, {
        data,
        expiresAt: Date.now() + FISCAL_CACHE_TTL_MS,
    });
}

async function ensureFiscalColumns() {
    if (fiscalColumnsEnsured) return;
    try {
        await db.query(`
            ALTER TABLE dash_vendas ADD COLUMN IF NOT EXISTS processo INTEGER DEFAULT NULL;
            ALTER TABLE dash_vendas ADD COLUMN IF NOT EXISTS natureza_id INTEGER DEFAULT NULL;
            ALTER TABLE dash_vendas ADD COLUMN IF NOT EXISTS natureza_operacao VARCHAR(255) DEFAULT NULL;
            CREATE INDEX IF NOT EXISTS idx_dash_vendas_effective_date
            ON dash_vendas (tenant_id, COALESCE(data_hora_proc, data_vencimento, data_venda));
        `);
        fiscalColumnsEnsured = true;
    } catch (_) {
        // Ignora caso já exista ou sem lock disponível no momento
    }
}

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
 * Resolve a Natureza de Operação limpa para detalhes individuais de `dash_vendas`.
 */
function resolveVendaNaturezaJs(v, isEntrada, effectiveCfop) {
    if (v.natureza_operacao && String(v.natureza_operacao).trim() !== '') {
        return String(v.natureza_operacao).trim();
    }
    const cfopNum = parseInt(String(effectiveCfop || v.cfop || '').replace(/\D/g, ''), 10);
    if (!isNaN(cfopNum) && cfopNum > 0) {
        if ((cfopNum >= 1200 && cfopNum <= 1209) || (cfopNum >= 2200 && cfopNum <= 2209) || (cfopNum >= 1410 && cfopNum <= 1419) || (cfopNum >= 2410 && cfopNum <= 2419)) {
            return 'Devolução de Venda';
        }
        if ((cfopNum >= 5200 && cfopNum <= 5209) || (cfopNum >= 6200 && cfopNum <= 6209) || (cfopNum >= 5410 && cfopNum <= 5419) || (cfopNum >= 6410 && cfopNum <= 6419)) {
            return 'Devolução de Compra';
        }
        if ([5910, 6910, 1910, 2910].includes(cfopNum)) {
            return 'Bonificação / Brinde';
        }
        if ((cfopNum >= 5900 && cfopNum <= 5999) || (cfopNum >= 6900 && cfopNum <= 6999)) {
            return 'Remessa / Outras Saídas';
        }
        if ((cfopNum >= 1900 && cfopNum <= 1999) || (cfopNum >= 2900 && cfopNum <= 2999)) {
            return 'Retorno / Outras Entradas';
        }
        if ((cfopNum >= 5401 && cfopNum <= 5405) || (cfopNum >= 6401 && cfopNum <= 6405)) {
            return 'Venda de Mercadoria (ST)';
        }
        if ((cfopNum >= 5100 && cfopNum <= 5199) || (cfopNum >= 6100 && cfopNum <= 6199)) {
            return 'Venda de Mercadoria';
        }
        if ((cfopNum >= 1401 && cfopNum <= 1409) || (cfopNum >= 2401 && cfopNum <= 2409)) {
            return 'Compra p/ Comercialização (ST)';
        }
        if (cfopNum >= 1000 && cfopNum < 4000) {
            return 'Compra / Entrada de Mercadoria';
        }
    }

    const esp = String(v.especie || '').toUpperCase();
    const processo = parseInt(v.processo || 0, 10);
    const valTotal = parseFloat(v.valor_total || 0);

    if (processo === 2 || valTotal < 0 || esp.includes('DEVOL') || esp.includes('GARANTIA') || esp.includes('TROCA')) {
        return 'Devolução / Garantia';
    }
    if (esp.includes('BONIF') || esp.includes('BRINDE')) {
        return 'Bonificação / Brinde';
    }
    if (esp.includes('REMESSA') || esp.includes('CONSIGN') || esp.includes('SEM PAGAMENTO')) {
        return 'Remessa / Sem Financeiro';
    }
    if (isEntrada) {
        return 'Compra / Entrada de Mercadoria';
    }
    const cliTipo = String(v.cliente_tipo || '1').trim();
    if (cliTipo === '9') return 'Venda Consumidor / Balcão';
    if (cliTipo === '5') return 'Venda Interna / Colaborador';
    return 'Venda de Mercadoria';
}

/**
 * Interpreta o parâmetro unificado `operacao` ou `cfop`:
 * - 'nat:Venda de Mercadoria' -> filtra por natureza_operacao
 * - 'cfop:5102' ou '5102'     -> filtra por código CFOP
 */
function parseOperacaoFilter(operacao, cfop) {
    const raw = (operacao !== undefined && operacao !== null && String(operacao).trim() !== '')
        ? String(operacao).trim()
        : (cfop !== undefined && cfop !== null ? String(cfop).trim() : '');

    if (!raw || raw === 'todos' || raw === 'todas' || raw === 'all') {
        return null;
    }
    if (raw.startsWith('nat:')) {
        const label = raw.slice(4).trim();
        return label ? { kind: 'natureza', value: label } : null;
    }
    if (raw.startsWith('cfop:')) {
        const code = raw.slice(5).replace(/\D/g, '');
        return code ? { kind: 'cfop', value: code } : null;
    }
    const digitsOnly = raw.replace(/\D/g, '');
    if (digitsOnly.length >= 3 && digitsOnly === raw) {
        return { kind: 'cfop', value: digitsOnly };
    }
    return { kind: 'natureza', value: raw };
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
    operacaoFilter,
    selectedCfops = null,
    search,
    tipo,
    apenasNfeEfetivo = false,
    hasChaveNfe = true,
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

    // Em dash_vendas, c.tipo = '2' é Pessoa Jurídica (CNPJ), NÃO fornecedor.
    // Devoluções de venda (processo = 2, cfop 1202/1411, valor_total < 0) pertencem a SAIDA (Vendas)
    // com valor assinado negativo para abater do faturamento líquido conforme Gerência Geral do ERP.
    const isEntradaExpr = `(
        v.es = 2
        AND COALESCE(v.processo, 1) <> 2
        AND COALESCE(v.valor_total, 0) > 0
        AND UPPER(TRIM(COALESCE(c.tipo, '1'))) IN ('FORNECEDOR', 'FORNECEDORES', 'FORNEC')
    )`;
    const vendaDateExpr = `CASE WHEN ${isEntradaExpr} THEN COALESCE(v.data_hora_proc, v.data_venda) ELSE COALESCE(v.data_hora_proc, v.data_vencimento, v.data_venda) END`;

    const vendaNaturezaSql = `
        CASE
            WHEN v.natureza_operacao IS NOT NULL AND TRIM(v.natureza_operacao) <> ''
                THEN TRIM(v.natureza_operacao)
            WHEN v.cfop IS NOT NULL AND v.cfop > 0 THEN
                CASE
                    WHEN (v.cfop BETWEEN 1200 AND 1209) OR (v.cfop BETWEEN 2200 AND 2209) OR (v.cfop BETWEEN 1410 AND 1419) OR (v.cfop BETWEEN 2410 AND 2419)
                        THEN 'Devolução de Venda'
                    WHEN (v.cfop BETWEEN 5200 AND 5209) OR (v.cfop BETWEEN 6200 AND 6209) OR (v.cfop BETWEEN 5410 AND 5419) OR (v.cfop BETWEEN 6410 AND 6419)
                        THEN 'Devolução de Compra'
                    WHEN v.cfop IN (5910, 6910, 1910, 2910)
                        THEN 'Bonificação / Brinde'
                    WHEN (v.cfop BETWEEN 5900 AND 5999) OR (v.cfop BETWEEN 6900 AND 6999)
                        THEN 'Remessa / Outras Saídas'
                    WHEN (v.cfop BETWEEN 1900 AND 1999) OR (v.cfop BETWEEN 2900 AND 2999)
                        THEN 'Retorno / Outras Entradas'
                    WHEN (v.cfop BETWEEN 5401 AND 5405) OR (v.cfop BETWEEN 6401 AND 6405)
                        THEN 'Venda de Mercadoria (ST)'
                    WHEN (v.cfop BETWEEN 5100 AND 5199) OR (v.cfop BETWEEN 6100 AND 6199)
                        THEN 'Venda de Mercadoria'
                    WHEN (v.cfop BETWEEN 1401 AND 1409) OR (v.cfop BETWEEN 2401 AND 2409)
                        THEN 'Compra p/ Comercialização (ST)'
                    WHEN v.cfop >= 1000 AND v.cfop < 4000
                        THEN 'Compra / Entrada de Mercadoria'
                    ELSE 'Venda de Mercadoria'
                END
            WHEN COALESCE(v.processo, 0) = 2
                 OR COALESCE(v.valor_total, 0) < 0
                 OR COALESCE(v.especie, '') ILIKE '%DEVOL%'
                 OR COALESCE(v.especie, '') ILIKE '%GARANTIA%'
                 OR COALESCE(v.especie, '') ILIKE '%TROCA%'
                THEN 'Devolução / Garantia'
            WHEN COALESCE(v.especie, '') ILIKE '%BONIF%'
                 OR COALESCE(v.especie, '') ILIKE '%BRINDE%'
                THEN 'Bonificação / Brinde'
            WHEN COALESCE(v.especie, '') ILIKE '%REMESSA%'
                 OR COALESCE(v.especie, '') ILIKE '%CONSIGN%'
                 OR COALESCE(v.especie, '') ILIKE '%SEM PAGAMENTO%'
                THEN 'Remessa / Sem Financeiro'
            WHEN ${isEntradaExpr}
                THEN 'Compra / Entrada de Mercadoria'
            WHEN TRIM(COALESCE(c.tipo, '1')) = '9'
                THEN 'Venda Consumidor / Balcão'
            WHEN TRIM(COALESCE(c.tipo, '1')) = '5'
                THEN 'Venda Interna / Colaborador'
            ELSE 'Venda de Mercadoria'
        END
    `;

    const cargasCfopExpr = `regexp_replace(COALESCE(NULLIF(TRIM(cg.dados_nfe->>'cfop'), ''), NULLIF(TRIM(cg.dados_nfe->'itens'->0->>'cfop'), ''), ''), '\\D', '', 'g')`;
    const cargasNatUpperExpr = `UPPER(TRIM(COALESCE(cg.dados_nfe->>'nat_op', cg.dados_nfe->>'natureza_operacao', '')))`;
    const emitKeyDocExpr = `SUBSTRING(regexp_replace(COALESCE(cg.chave_acesso, ''), '\\D', '', 'g') FROM 7 FOR 14)`;

    // No ERP Coliseu, as Compras comerciais em dash_cargas são exportadas com tipo_operacao = 'SAIDA'
    // e natureza_operacao iniciando por 'COMPRA' / 'ENTRADA DE MERCADORIA' (onde remetente = Filial e destinatario = Fornecedor).
    const isCargasCompraComercialExpr = `(
        UPPER(COALESCE(cg.dados_nfe->>'tipo_operacao', 'SAIDA')) = 'SAIDA'
        AND (
            ${cargasNatUpperExpr} LIKE '%COMPRA%'
            OR ${cargasNatUpperExpr} LIKE 'ENTRADA DE MERCADORIA%'
            OR ${cargasNatUpperExpr} LIKE 'ENTRADA DE BONIFICA%'
            OR ${cargasNatUpperExpr} LIKE 'ENTRADA BONIFICA%'
            OR ${cargasNatUpperExpr} LIKE 'OUTRA ENTRADA%'
            OR ${cargasNatUpperExpr} LIKE 'OUTRAS ENTRADA%'
        )
        AND ${cargasNatUpperExpr} NOT LIKE '%DEVOLU%'
        AND ${cargasNatUpperExpr} NOT LIKE '%TRANSFER%'
    )`;

    // Todas as Notas Fiscais emitidas por qualquer filial do tenant (CNPJ emitente na chave de acesso pertence a dash_filiais)
    // que não sejam compras comerciais são Notas Emitidas pela Empresa (SAIDA), incluindo CFOPs 5102, 5949 (Transferência/Ajuste),
    // 1202 e 1411 (Devoluções de venda de emissão própria), 5405, 6102, 5117, 5922, 5910, 6404.
    const isCargasSaidaExpr = `(
        NOT ${isCargasCompraComercialExpr}
        AND (
            ${emitKeyDocExpr} IN (SELECT doc FROM tenant_docs)
            OR (
                ${cargasCfopExpr} ~ '^[567]'
                AND regexp_replace(COALESCE(cg.remetente_documento, ''), '\\D', '', 'g') IN (SELECT doc FROM tenant_docs)
            )
        )
    )`;

    // Notas Fiscais de Entrada em dash_cargas (Compras comerciais + Entradas de NF de fornecedores / terceiros)
    const isCargasCompraAvulsaExpr = `(
        NOT ${isCargasCompraComercialExpr}
        AND NOT ${isCargasSaidaExpr}
        AND (
            ${cargasCfopExpr} ~ '^[123]'
            OR ${cargasNatUpperExpr} LIKE 'ENTRADA%'
            OR ${cargasNatUpperExpr} LIKE 'OUTRA ENTRADA%'
            OR ${cargasNatUpperExpr} LIKE 'OUTRAS ENTRADA%'
            OR ${cargasNatUpperExpr} LIKE '%COMPRA%'
            OR ${cargasNatUpperExpr} LIKE '%AJUSTE%'
            OR ${cargasNatUpperExpr} LIKE 'DEVOLUÇÃO DE NOTAS%'
            OR ${emitKeyDocExpr} NOT IN (SELECT doc FROM tenant_docs)
        )
    )`;

    const isCargasEntradaExpr = `(${isCargasCompraComercialExpr} OR ${isCargasCompraAvulsaExpr})`;
    const isCargasSaidaFallbackExpr = isCargasSaidaExpr;

    const cargasEffectiveDateExpr = `CASE
        WHEN ${isCargasCompraComercialExpr} AND (cg.dados_nfe->>'id_pedido') ~ '^[0-9]+$'
        THEN COALESCE(
            (
                SELECT MIN(sub.dt)
                FROM (
                    SELECT COALESCE(vx.data_hora_proc, vx.data_venda)::timestamptz AS dt
                    FROM dash_vendas vx
                    WHERE vx.tenant_id = cg.tenant_id
                      AND COALESCE(vx.processo, 1) != 9
                      AND vx.id_firebird >= (cg.dados_nfe->>'id_pedido')::int
                    ORDER BY vx.id_firebird ASC
                    LIMIT 5
                ) sub
            ),
            cg.data_emissao::timestamptz
        )
        ELSE cg.data_emissao::timestamptz
    END`;

    const cargasValorExpr = `CASE
        WHEN ${isCargasCompraComercialExpr}
             AND regexp_replace(COALESCE(cg.dados_nfe->'itens'->0->>'cfop', ''), '\\D', '', 'g') IN ('1403', '2403')
             AND COALESCE((cg.dados_nfe->>'valor_frete')::numeric, 0) = 0
             AND (COALESCE(cg.valor_total, 0) - COALESCE(cg.valor_produtos, 0)) > 5
             AND jsonb_typeof(cg.dados_nfe->'itens') = 'array'
             AND jsonb_array_length(cg.dados_nfe->'itens') > 0
        THEN COALESCE(
            (
                SELECT SUM(COALESCE((it->>'valor_total')::numeric, 0) * (1 - COALESCE((it->>'desconto')::numeric, 0) / 100.0))
                FROM jsonb_array_elements(cg.dados_nfe->'itens') it
            ),
            cg.valor_produtos,
            cg.valor_total,
            0
        )::numeric(15,2)
        ELSE COALESCE(cg.valor_total, 0)::numeric(15,2)
    END`;

    const cargasValorProdutosExpr = `COALESCE(cg.valor_produtos, ${cargasValorExpr}, 0)::numeric(15,2)`;

    let cargasDeptoClause = '';
    let vendasDeptoClause = '';
    if (deptoId && deptoId !== 'todas' && deptoId !== 'all' && !isNaN(parseInt(deptoId, 10))) {
        const pDepto = pushParam(parseInt(deptoId, 10));
        vendasDeptoClause = ` AND v.depto_id = ${pDepto}`;
        if (filialDoc) {
            const pDoc = pushParam(filialDoc);
            cargasDeptoClause = ` AND (
                CASE
                    WHEN ${isCargasSaidaFallbackExpr}
                    THEN ${emitKeyDocExpr} = ${pDoc}
                    WHEN UPPER(COALESCE(cg.dados_nfe->>'tipo_operacao', 'SAIDA')) = 'ENTRADA'
                    THEN regexp_replace(COALESCE(cg.destinatario_documento, ''), '\\D', '', 'g') = ${pDoc}
                    ELSE regexp_replace(COALESCE(cg.remetente_documento, ''), '\\D', '', 'g') = ${pDoc}
                END
            )`;
        }
    }

    let cargasTipoClause = ` AND (${isCargasEntradaExpr} OR ${isCargasSaidaFallbackExpr})`;
    let vendasTipoClause = '';
    if (tipo === 'SAIDA') {
        cargasTipoClause = ` AND ${isCargasSaidaFallbackExpr}`;
        vendasTipoClause = ` AND NOT ${isEntradaExpr}`;
    } else if (tipo === 'ENTRADA') {
        cargasTipoClause = ` AND ${isCargasEntradaExpr}`;
        vendasTipoClause = ` AND ${isEntradaExpr}`;
    }

    const vendasOnlyNfeClause = apenasNfeEfetivo
        ? (
            hasChaveNfe
                ? ` AND (v.chave_nfe IS NOT NULL AND LENGTH(TRIM(v.chave_nfe)) >= 40)`
                : ` AND (
                    (v.numero_nota IS NOT NULL AND v.numero_nota > 0)
                    OR (v.chave_nfe IS NOT NULL AND TRIM(v.chave_nfe) <> '')
                )`
        )
        : '';

    let searchFilter = `WHERE nb.data_emissao >= ${pStartTs} AND nb.data_emissao <= ${pEndTs}`;
    if (search && String(search).trim() !== '') {
        const rawSearch = String(search).trim();
        const pSearch = pushParam(`%${rawSearch}%`);
        searchFilter += ` AND (
            nb.numero_nota ILIKE ${pSearch}
            OR COALESCE(nb.chave_nfe, '') ILIKE ${pSearch}
            OR nb.parceiro_nome ILIKE ${pSearch}
            OR nb.parceiro_documento ILIKE ${pSearch}
            OR nb.numero_pedido ILIKE ${pSearch}
            OR nb.cidade ILIKE ${pSearch}
            OR nb.natureza_operacao ILIKE ${pSearch}
        )`;
    }

    let operacaoWhere = 'WHERE 1=1';
    if (operacaoFilter) {
        if (operacaoFilter.kind === 'cfop') {
            const pCfop = pushParam(operacaoFilter.value);
            operacaoWhere += ` AND (
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
        } else if (operacaoFilter.kind === 'natureza') {
            const pNat = pushParam(operacaoFilter.value);
            operacaoWhere += ` AND UPPER(TRIM(nf.natureza_operacao)) = UPPER(TRIM(${pNat}))`;
        }
    }

    if (Array.isArray(selectedCfops) && selectedCfops.length > 0) {
        const cleanList = selectedCfops
            .map((c) => String(c || '').replace(/\D/g, '').trim())
            .filter((c) => c.length >= 3);
        if (cleanList.length > 0) {
            const pCfopsArr = pushParam(cleanList);
            operacaoWhere += ` AND (
                nf.tipo_operacao = 'ENTRADA'
                OR nf.cfop = ANY(${pCfopsArr}::text[])
            )`;
        }
    }

    const cteSql = `
        WITH tenant_docs AS (
            SELECT DISTINCT regexp_replace(COALESCE(documento, ''), '\\D', '', 'g') AS doc
            FROM dash_filiais
            WHERE tenant_id = ${pTenant}
              AND LENGTH(regexp_replace(COALESCE(documento, ''), '\\D', '', 'g')) >= 11
        ),
        notas_base AS (
            SELECT
                'cargas'::text AS origem,
                cg.id::bigint AS registro_id,
                CASE
                    WHEN ${isCargasSaidaFallbackExpr} THEN 'SAIDA'
                    ELSE 'ENTRADA'
                END AS tipo_operacao,
                'NF-e (XML)'::text AS modelo_doc,
                COALESCE(NULLIF(TRIM(cg.numero), ''), NULLIF(TRIM(cg.dados_nfe->>'numero_nota'), ''), '-')::text AS numero_nota,
                COALESCE(NULLIF(TRIM(cg.serie), ''), NULLIF(TRIM(cg.dados_nfe->>'serie'), ''), '1')::text AS serie,
                COALESCE(NULLIF(TRIM(cg.dados_nfe->>'id_pedido'), ''), '-')::text AS numero_pedido,
                COALESCE(NULLIF(TRIM(cg.chave_acesso), ''), NULLIF(TRIM(cg.dados_nfe->>'chave_nfe'), ''))::text AS chave_nfe,
                (${tipo === 'SAIDA' ? 'cg.data_emissao::timestamptz' : cargasEffectiveDateExpr})::timestamptz AS data_emissao,
                CASE
                    WHEN ${isCargasCompraComercialExpr}
                    THEN COALESCE(NULLIF(TRIM(cg.destinatario_nome), ''), 'Fornecedor não informado')
                    WHEN ${isCargasSaidaFallbackExpr} AND regexp_replace(COALESCE(cg.destinatario_documento, ''), '\\D', '', 'g') IN (SELECT doc FROM tenant_docs)
                    THEN COALESCE(NULLIF(TRIM(cg.remetente_nome), ''), NULLIF(TRIM(cg.destinatario_nome), ''), 'Consumidor Final')
                    WHEN ${isCargasSaidaFallbackExpr}
                    THEN COALESCE(NULLIF(TRIM(cg.destinatario_nome), ''), NULLIF(TRIM(cg.remetente_nome), ''), 'Consumidor Final')
                    WHEN UPPER(COALESCE(cg.dados_nfe->>'tipo_operacao', 'SAIDA')) = 'ENTRADA'
                    THEN COALESCE(NULLIF(TRIM(cg.remetente_nome), ''), 'Fornecedor não informado')
                    ELSE COALESCE(NULLIF(TRIM(cg.destinatario_nome), ''), 'Consumidor Final')
                END::text AS parceiro_nome,
                CASE
                    WHEN ${isCargasCompraComercialExpr}
                    THEN COALESCE(NULLIF(TRIM(cg.destinatario_documento), ''), '')
                    WHEN ${isCargasSaidaFallbackExpr} AND regexp_replace(COALESCE(cg.destinatario_documento, ''), '\\D', '', 'g') IN (SELECT doc FROM tenant_docs)
                    THEN COALESCE(NULLIF(TRIM(cg.remetente_documento), ''), '')
                    WHEN ${isCargasSaidaFallbackExpr}
                    THEN COALESCE(NULLIF(TRIM(cg.destinatario_documento), ''), '')
                    WHEN UPPER(COALESCE(cg.dados_nfe->>'tipo_operacao', 'SAIDA')) = 'ENTRADA'
                    THEN COALESCE(NULLIF(TRIM(cg.remetente_documento), ''), '')
                    ELSE COALESCE(NULLIF(TRIM(cg.destinatario_documento), ''), '')
                END::text AS parceiro_documento,
                CASE
                    WHEN ${isCargasCompraComercialExpr}
                    THEN COALESCE(NULLIF(TRIM(cg.destinatario_municipio), ''), '')
                    WHEN ${isCargasSaidaFallbackExpr} AND regexp_replace(COALESCE(cg.destinatario_documento, ''), '\\D', '', 'g') IN (SELECT doc FROM tenant_docs)
                    THEN COALESCE(NULLIF(TRIM(cg.remetente_municipio), ''), '')
                    WHEN ${isCargasSaidaFallbackExpr}
                    THEN COALESCE(NULLIF(TRIM(cg.destinatario_municipio), ''), '')
                    WHEN UPPER(COALESCE(cg.dados_nfe->>'tipo_operacao', 'SAIDA')) = 'ENTRADA'
                    THEN COALESCE(NULLIF(TRIM(cg.remetente_municipio), ''), '')
                    ELSE COALESCE(NULLIF(TRIM(cg.destinatario_municipio), ''), '')
                END::text AS cidade,
                CASE
                    WHEN ${isCargasCompraComercialExpr}
                    THEN COALESCE(NULLIF(TRIM(cg.destinatario_uf), ''), '')
                    WHEN ${isCargasSaidaFallbackExpr} AND regexp_replace(COALESCE(cg.destinatario_documento, ''), '\\D', '', 'g') IN (SELECT doc FROM tenant_docs)
                    THEN COALESCE(NULLIF(TRIM(cg.remetente_uf), ''), '')
                    WHEN ${isCargasSaidaFallbackExpr}
                    THEN COALESCE(NULLIF(TRIM(cg.destinatario_uf), ''), '')
                    WHEN UPPER(COALESCE(cg.dados_nfe->>'tipo_operacao', 'SAIDA')) = 'ENTRADA'
                    THEN COALESCE(NULLIF(TRIM(cg.remetente_uf), ''), '')
                    ELSE COALESCE(NULLIF(TRIM(cg.destinatario_uf), ''), '')
                END::text AS uf,
                COALESCE(NULLIF(${cargasCfopExpr}, ''), '5102')::text AS cfop,
                COALESCE(
                    NULLIF(TRIM(COALESCE(cg.dados_nfe->>'nat_op', cg.dados_nfe->>'natureza_operacao')), ''),
                    CASE
                        WHEN ${isCargasSaidaFallbackExpr}
                        THEN 'Venda de Mercadoria'
                        ELSE 'Compra / Entrada de Mercadoria'
                    END
                )::text AS natureza_operacao,
                (${cargasValorProdutosExpr})::numeric(15,2) AS valor_produtos,
                (${cargasValorExpr})::numeric(15,2) AS valor_total,
                COALESCE(NULLIF(TRIM(cg.status), ''), 'AUTORIZADA')::text AS status,
                COALESCE(
                    CASE WHEN (cg.dados_nfe->>'qtd_itens') ~ '^[0-9]+$' THEN (cg.dados_nfe->>'qtd_itens')::int ELSE NULL END,
                    CASE WHEN jsonb_typeof(cg.dados_nfe->'itens') = 'array' THEN jsonb_array_length(cg.dados_nfe->'itens') ELSE 0 END
                )::int AS qtd_itens
            FROM dash_cargas cg
            WHERE cg.tenant_id = ${pTenant}
              AND COALESCE(cg.tipo_documento, 'NFE') = 'NFE'
              AND cg.data_emissao >= (${tipo === 'SAIDA' ? `${pStartDate}::date` : `${pStartDate}::date - INTERVAL '60 days'`})
              AND cg.data_emissao <= (${tipo === 'SAIDA' ? `(${pEndDate}::date + INTERVAL '1 day')` : `${pEndDate}::date + INTERVAL '15 days'`})
              AND (
                  (cg.data_emissao >= ${pStartTs} AND cg.data_emissao <= ${pEndTs})
                  OR (${tipo === 'SAIDA' ? 'FALSE' : isCargasCompraComercialExpr})
              )
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
                COALESCE(NULLIF(v.cfop, 0)::text, '5102')::text AS cfop,
                (${vendaNaturezaSql})::text AS natureza_operacao,
                COALESCE(v.valor_total, 0)::numeric(15,2) AS valor_produtos,
                COALESCE(v.valor_total - COALESCE(v.valor_desconto, 0), 0)::numeric(15,2) AS valor_total,
                COALESCE(NULLIF(TRIM(v.status), ''), CASE WHEN ${isEntradaExpr} THEN 'RECEBIDA' ELSE 'FATURADO' END)::text AS status,
                0::int AS qtd_itens
            FROM dash_vendas v
            LEFT JOIN dash_clientes c ON c.tenant_id = v.tenant_id AND c.id_firebird = v.cliente_id_firebird
            WHERE v.tenant_id = ${pTenant}
              AND COALESCE(v.data_hora_proc, v.data_vencimento, v.data_venda) >= ${pStartTs}
              AND COALESCE(v.data_hora_proc, v.data_vencimento, v.data_venda) <= ${pEndTs}
              AND COALESCE(v.processo, 1) != 9
              AND (${vendaDateExpr}) >= ${pStartTs}
              AND (${vendaDateExpr}) <= ${pEndTs}
              AND NOT EXISTS (
                  SELECT 1 FROM dash_cargas cg_k
                  WHERE cg_k.tenant_id = ${pTenant}
                    AND cg_k.chave_acesso = TRIM(v.chave_nfe)
                    AND cg_k.chave_acesso IS NOT NULL
                    AND cg_k.chave_acesso <> ''
                    AND UPPER(TRIM(COALESCE(cg_k.status, ''))) NOT IN ('CANCELADA', 'CANCELADO', 'DENEGADA', 'INUTILIZADA')
              )
              AND NOT EXISTS (
                  SELECT 1 FROM dash_cargas cg_p
                  WHERE cg_p.tenant_id = ${pTenant}
                    AND (cg_p.dados_nfe ->> 'id_pedido') = v.id_firebird::text
                    AND (cg_p.dados_nfe ->> 'id_pedido') IS NOT NULL
                    AND UPPER(TRIM(COALESCE(cg_p.status, ''))) NOT IN ('CANCELADA', 'CANCELADO', 'DENEGADA', 'INUTILIZADA')
              )
              AND UPPER(TRIM(COALESCE(v.status, ''))) NOT IN ('CANCELADO', 'CANCELADA', 'ABERTO', 'PENDENTE', 'ORÇAMENTO', 'ORCAMENTO', 'NULO', 'TESTE')
              AND COALESCE(v.status, '') NOT ILIKE '%TRANSF%'
              AND (v.especie IS NULL OR v.especie NOT ILIKE '%TRANSF%')
              AND (v.natureza_operacao IS NULL OR (v.natureza_operacao NOT ILIKE '%TRANSF%' AND v.natureza_operacao NOT ILIKE '%SIMPLES REMESSA%'))
              AND (v.cfop IS NULL OR v.cfop NOT IN (5151, 5152, 5155, 5156, 6151, 6152, 6155, 6156, 1151, 1152, 1155, 1156, 2151, 2152, 2155, 2156))
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
        ),
        notas_periodo AS MATERIALIZED (
            SELECT * FROM notas_base nb
            ${searchFilter}
        ),
        notas_filtradas AS MATERIALIZED (
            SELECT * FROM notas_periodo nf
            ${operacaoWhere}
        )
    `;

    return { cteSql, params };
}

function parseApenasNfe(val, defaultVal = true) {
    if (val === undefined || val === null || String(val).trim() === '') return Boolean(defaultVal);
    const s = String(val).trim().toLowerCase();
    if (s === 'false' || s === '0' || s === 'nao' || s === 'não' || s === 'todos') return false;
    return s === 'true' || s === '1' || s === 'sim';
}

function parseSelectedCfops(cfopsParam, defaultList = null) {
    if (cfopsParam !== undefined && cfopsParam !== null) {
        const raw = String(cfopsParam).trim().toLowerCase();
        if (raw === '' || raw === 'todos' || raw === 'todas' || raw === 'all') {
            return null;
        }
        if (raw === 'nenhum' || raw === 'none') {
            return ['0000'];
        }
        const parts = raw
            .split(',')
            .map((c) => c.replace(/\D/g, '').trim())
            .filter((c) => c.length >= 3);
        return parts.length > 0 ? parts : null;
    }
    if (Array.isArray(defaultList) && defaultList.length > 0) {
        const returnCfops = ['1201', '1202', '1411', '2201', '2202', '2411'];
        const hasSales = defaultList.some((c) => /^[56]/.test(String(c)));
        const hasReturn = defaultList.some((c) => returnCfops.includes(String(c)));
        if (hasSales && !hasReturn) {
            return Array.from(new Set([...defaultList, ...returnCfops]));
        }
        return defaultList;
    }
    return null;
}

/**
 * GET /api/fiscal/resumo
 * Retorna KPIs consolidados de Notas Emitidas (Saída) e Notas de Entrada,
 * Naturezas de Operação + CFOPs disponíveis e evolução no período.
 */
router.get('/resumo', async (req, res, next) => {
    try {
        await ensureFiscalColumns();
        const tenantId = req.tenant.id;
        const period = req.query.period || 'thisMonth';
        const { start_date, end_date, depto_id, cfop, cfops: cfopsParam, operacao, search, apenas_nfe } = req.query;

        const headerOverride = req.headers['x-only-nf-sales'];
        const sessionOverride = headerOverride === 'true' ? true : (headerOverride === 'false' ? false : null);
        const userKey = req.user?.email || req.user?.id || req.headers['x-user-key'] || null;
        const settings = await getUserSettings(tenantId, userKey, sessionOverride);
        const hasSyncedNf = Boolean(settings.has_synced_nf);
        const hasChaveNfe = Boolean(settings.has_chave_nfe);
        const apenasNfeSolicitado = parseApenasNfe(apenas_nfe, true);
        // Proteção inteligente: se o tenant possui 0 NFs sincronizadas no banco, não zera a tela
        const apenasNfeEfetivo = Boolean(apenasNfeSolicitado && hasSyncedNf);
        const operacaoFilter = parseOperacaoFilter(operacao, cfop);
        const selectedCfops = parseSelectedCfops(cfopsParam, settings.cfops_faturamento);

        const store = db.dbContext.getStore();
        const tzOffset = store ? store.tzOffset : -180;
        const anchorDate = new Date(Date.now() + (tzOffset * 60 * 1000));
        const { start, end } = getPeriodRange(period, start_date, end_date, anchorDate);

        const startDateOnly = start.slice(0, 10);
        const endDateOnly = end.slice(0, 10);

        const cacheKey = `${tenantId}:resumo:${JSON.stringify({
            start,
            end,
            depto_id: depto_id || 'todas',
            operacaoFilter,
            selectedCfops,
            search: search || '',
            apenasNfeEfetivo,
        })}`;
        const cachedResumo = getFiscalCache(cacheKey);
        if (cachedResumo) {
            return res.json(cachedResumo);
        }

        const filialDoc = await resolveFilialDoc(tenantId, depto_id);

        const { cteSql, params } = buildFiscalUnifiedCte({
            startDateOnly,
            endDateOnly,
            startTs: start,
            endTs: end,
            deptoId: depto_id,
            filialDoc,
            operacaoFilter,
            selectedCfops,
            search,
            tipo: null,
            apenasNfeEfetivo,
            hasChaveNfe,
        });
        params[0] = tenantId;

        const combinedRes = await db.query(`
            ${cteSql},
            kpi_agg AS (
                SELECT
                    COUNT(*) FILTER (WHERE tipo_operacao = 'SAIDA') AS emitidas_qtd,
                    COUNT(*) FILTER (WHERE tipo_operacao = 'SAIDA' AND cfop !~ '^[123]') AS emitidas_saidas_brutas_qtd,
                    COALESCE(SUM(valor_produtos) FILTER (WHERE tipo_operacao = 'SAIDA' AND cfop !~ '^[123]'), 0) AS emitidas_saidas_brutas_valor_produtos,
                    COALESCE(SUM(valor_total) FILTER (WHERE tipo_operacao = 'SAIDA' AND cfop !~ '^[123]'), 0) AS emitidas_saidas_brutas_valor,
                    COUNT(*) FILTER (WHERE tipo_operacao = 'SAIDA' AND cfop ~ '^[123]') AS emitidas_devolucoes_qtd,
                    COALESCE(SUM(valor_produtos) FILTER (WHERE tipo_operacao = 'SAIDA' AND cfop ~ '^[123]'), 0) AS emitidas_devolucoes_valor_produtos,
                    COALESCE(SUM(valor_total) FILTER (WHERE tipo_operacao = 'SAIDA' AND cfop ~ '^[123]'), 0) AS emitidas_devolucoes_valor,
                    COALESCE(SUM(CASE WHEN cfop ~ '^[123]' THEN -valor_produtos ELSE valor_produtos END) FILTER (WHERE tipo_operacao = 'SAIDA'), 0) AS emitidas_valor_produtos,
                    COALESCE(SUM(CASE WHEN cfop ~ '^[123]' THEN -valor_total ELSE valor_total END) FILTER (WHERE tipo_operacao = 'SAIDA'), 0) AS emitidas_valor,
                    COUNT(*) FILTER (
                        WHERE tipo_operacao = 'SAIDA'
                          AND (origem = 'cargas' OR modelo_doc = 'NF-e / NFC-e' OR (chave_nfe IS NOT NULL AND chave_nfe <> ''))
                    ) AS emitidas_chave_qtd,
                    COUNT(*) FILTER (WHERE tipo_operacao = 'ENTRADA') AS entradas_qtd,
                    COALESCE(SUM(valor_produtos) FILTER (WHERE tipo_operacao = 'ENTRADA'), 0) AS entradas_valor_produtos,
                    COALESCE(SUM(valor_total) FILTER (WHERE tipo_operacao = 'ENTRADA'), 0) AS entradas_valor,
                    COUNT(*) FILTER (
                        WHERE tipo_operacao = 'ENTRADA'
                          AND (origem = 'cargas' OR modelo_doc = 'NF-e / NFC-e' OR (chave_nfe IS NOT NULL AND chave_nfe <> ''))
                    ) AS entradas_chave_qtd
                FROM notas_filtradas
            ),
            nat_agg AS (
                SELECT COALESCE(json_agg(t), '[]'::json) AS rows
                FROM (
                    SELECT
                        TRIM(natureza_operacao) AS natureza_operacao,
                        tipo_operacao,
                        COUNT(*) AS qtd,
                        COALESCE(SUM(valor_produtos), 0) AS valor_produtos,
                        COALESCE(SUM(valor_total), 0) AS valor
                    FROM notas_periodo
                    WHERE natureza_operacao IS NOT NULL AND TRIM(natureza_operacao) <> ''
                    GROUP BY TRIM(natureza_operacao), tipo_operacao
                    ORDER BY valor DESC
                    LIMIT 40
                ) t
            ),
            cfop_agg AS (
                SELECT COALESCE(json_agg(t), '[]'::json) AS rows
                FROM (
                    SELECT
                        cfop,
                        tipo_operacao,
                        STRING_AGG(DISTINCT TRIM(natureza_operacao), ' / ' ORDER BY TRIM(natureza_operacao)) AS natureza_operacao,
                        COUNT(*) AS qtd,
                        COALESCE(SUM(valor_produtos), 0) AS valor_produtos,
                        COALESCE(SUM(valor_total), 0) AS valor
                    FROM notas_periodo
                    WHERE cfop IS NOT NULL AND cfop <> ''
                    GROUP BY cfop, tipo_operacao
                    ORDER BY CASE WHEN tipo_operacao = 'SAIDA' THEN 0 ELSE 1 END ASC, valor DESC, cfop ASC
                    LIMIT 50
                ) t
            ),
            evol_agg AS (
                SELECT COALESCE(json_agg(t), '[]'::json) AS rows
                FROM (
                    SELECT
                        TO_CHAR(data_emissao, 'YYYY-MM-DD') AS data,
                        COALESCE(SUM(CASE WHEN cfop ~ '^[123]' THEN -valor_total ELSE valor_total END) FILTER (WHERE tipo_operacao = 'SAIDA'), 0) AS valor_saida,
                        COUNT(*) FILTER (WHERE tipo_operacao = 'SAIDA') AS qtd_saida,
                        COALESCE(SUM(valor_total) FILTER (WHERE tipo_operacao = 'ENTRADA'), 0) AS valor_entrada,
                        COUNT(*) FILTER (WHERE tipo_operacao = 'ENTRADA') AS qtd_entrada
                    FROM notas_filtradas
                    GROUP BY 1
                    ORDER BY 1 ASC
                ) t
            )
            SELECT
                (SELECT row_to_json(kpi_agg) FROM kpi_agg) AS kpi,
                (SELECT rows FROM nat_agg) AS naturezas,
                (SELECT rows FROM cfop_agg) AS cfops,
                (SELECT rows FROM evol_agg) AS evolucao
        `, params);

        const row0 = combinedRes.rows[0] || {};
        const k = row0.kpi || {};
        const naturezasRows = Array.isArray(row0.naturezas) ? row0.naturezas : [];
        let cfopRows = Array.isArray(row0.cfops) ? row0.cfops : [];
        const evolucaoRows = Array.isArray(row0.evolucao) ? row0.evolucao : [];

        if (cfopRows.length === 0) {
            const fallbackCfopRes = await db.query(
                `SELECT
                    regexp_replace(TRIM(vi.cfop), '\\D', '', 'g') AS cfop,
                    CASE
                        WHEN regexp_replace(TRIM(vi.cfop), '\\D', '', 'g') ~ '^[123]' THEN 'ENTRADA'
                        ELSE 'SAIDA'
                    END AS tipo_operacao,
                    'OPERAÇÃO FISCAL'::text AS natureza_operacao,
                    COUNT(DISTINCT vi.venda_id_firebird) AS qtd,
                    COALESCE(SUM(vi.valor_total), 0) AS valor_produtos,
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
                 LIMIT 40`,
                [tenantId, start, end]
            ).catch(() => ({ rows: [] }));
            cfopRows = fallbackCfopRes.rows;
        }

        const emitidasQtd = parseInt(k.emitidas_qtd || 0, 10);
        const emitidasSaidasBrutasQtd = parseInt(k.emitidas_saidas_brutas_qtd || 0, 10);
        const emitidasSaidasBrutasValorProdutos = parseFloat(k.emitidas_saidas_brutas_valor_produtos || 0);
        const emitidasSaidasBrutasValor = parseFloat(k.emitidas_saidas_brutas_valor || 0);
        const emitidasDevolucoesQtd = parseInt(k.emitidas_devolucoes_qtd || 0, 10);
        const emitidasDevolucoesValorProdutos = parseFloat(k.emitidas_devolucoes_valor_produtos || 0);
        const emitidasDevolucoesValor = parseFloat(k.emitidas_devolucoes_valor || 0);
        const emitidasValorProdutos = parseFloat(k.emitidas_valor_produtos || 0);
        const emitidasValor = parseFloat(k.emitidas_valor || 0);
        const emitidasSaidasBrutasDescontos = Math.max(0, Number((emitidasSaidasBrutasValorProdutos - emitidasSaidasBrutasValor).toFixed(2)));
        const emitidasDevolucoesDescontos = Math.max(0, Number((emitidasDevolucoesValorProdutos - emitidasDevolucoesValor).toFixed(2)));
        const emitidasDescontosValor = Math.max(0, Number((emitidasValorProdutos - emitidasValor).toFixed(2)));
        const emitidasChaveQtd = parseInt(k.emitidas_chave_qtd || 0, 10);
        const entradasQtd = parseInt(k.entradas_qtd || 0, 10);
        const entradasValorProdutos = parseFloat(k.entradas_valor_produtos || 0);
        const entradasValor = parseFloat(k.entradas_valor || 0);
        const entradasChaveQtd = parseInt(k.entradas_chave_qtd || 0, 10);

        const naturezas = naturezasRows.map((r) => ({
            key: `nat:${r.natureza_operacao}`,
            natureza_operacao: r.natureza_operacao,
            tipo_operacao: r.tipo_operacao,
            qtd: parseInt(r.qtd || 0, 10),
            valor_produtos: parseFloat(r.valor_produtos || 0),
            valor: parseFloat(r.valor || 0),
        }));

        const cfops = cfopRows.map((r) => ({
            key: `cfop:${r.cfop}`,
            cfop: r.cfop,
            tipo_operacao: r.tipo_operacao,
            natureza_operacao: r.natureza_operacao || '',
            qtd: parseInt(r.qtd || 0, 10),
            valor_produtos: parseFloat(r.valor_produtos || 0),
            valor: parseFloat(r.valor || 0),
        }));

        const payload = {
            period: { start, end, label: period },
            apenas_nfe: apenasNfeSolicitado,
            apenas_nfe_efetivo: apenasNfeEfetivo,
            has_synced_nf: hasSyncedNf,
            cfops_faturamento: settings.cfops_faturamento || null,
            kpis: {
                emitidas_qtd: emitidasQtd,
                emitidas_saidas_brutas_qtd: emitidasSaidasBrutasQtd,
                emitidas_saidas_brutas_valor_produtos: emitidasSaidasBrutasValorProdutos,
                emitidas_saidas_brutas_descontos: emitidasSaidasBrutasDescontos,
                emitidas_saidas_brutas_valor: emitidasSaidasBrutasValor,
                emitidas_devolucoes_qtd: emitidasDevolucoesQtd,
                emitidas_devolucoes_valor_produtos: emitidasDevolucoesValorProdutos,
                emitidas_devolucoes_descontos: emitidasDevolucoesDescontos,
                emitidas_devolucoes_valor: emitidasDevolucoesValor,
                emitidas_valor_produtos: emitidasValorProdutos,
                emitidas_descontos_valor: emitidasDescontosValor,
                emitidas_valor: emitidasValor,
                emitidas_ticket_medio: emitidasQtd > 0 ? emitidasValor / emitidasQtd : 0,
                emitidas_chave_qtd: emitidasChaveQtd,
                entradas_qtd: entradasQtd,
                entradas_valor_produtos: entradasValorProdutos,
                entradas_valor: entradasValor,
                entradas_ticket_medio: entradasQtd > 0 ? entradasValor / entradasQtd : 0,
                entradas_chave_qtd: entradasChaveQtd,
                saldo_fiscal: emitidasValor - entradasValor,
                total_documentos: emitidasQtd + entradasQtd,
            },
            naturezas,
            cfops,
            evolucao: evolucaoRows.map((r) => ({
                data: r.data,
                valor_saida: parseFloat(r.valor_saida || 0),
                qtd_saida: parseInt(r.qtd_saida || 0, 10),
                valor_entrada: parseFloat(r.valor_entrada || 0),
                qtd_entrada: parseInt(r.qtd_entrada || 0, 10),
            })),
        };
        setFiscalCache(cacheKey, payload);
        res.json(payload);
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
        await ensureFiscalColumns();
        const tenantId = req.tenant.id;
        const period = req.query.period || 'thisMonth';
        const { start_date, end_date, depto_id, cfop, cfops: cfopsParam, operacao, search, apenas_nfe } = req.query;

        const headerOverride = req.headers['x-only-nf-sales'];
        const sessionOverride = headerOverride === 'true' ? true : (headerOverride === 'false' ? false : null);
        const userKey = req.user?.email || req.user?.id || req.headers['x-user-key'] || null;
        const settings = await getUserSettings(tenantId, userKey, sessionOverride);
        const hasSyncedNf = Boolean(settings.has_synced_nf);
        const hasChaveNfe = Boolean(settings.has_chave_nfe);
        const apenasNfeSolicitado = parseApenasNfe(apenas_nfe, true);
        const apenasNfeEfetivo = Boolean(apenasNfeSolicitado && hasSyncedNf);
        const operacaoFilter = parseOperacaoFilter(operacao, cfop);
        const selectedCfops = parseSelectedCfops(cfopsParam, settings.cfops_faturamento);

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

        const cacheKey = `${tenantId}:notas:${JSON.stringify({
            start,
            end,
            depto_id: depto_id || 'todas',
            operacaoFilter,
            selectedCfops,
            search: search || '',
            tipo,
            page,
            limit,
            apenasNfeEfetivo,
        })}`;
        const cachedNotas = getFiscalCache(cacheKey);
        if (cachedNotas) {
            return res.json(cachedNotas);
        }

        const filialDoc = await resolveFilialDoc(tenantId, depto_id);

        const { cteSql, params } = buildFiscalUnifiedCte({
            startDateOnly,
            endDateOnly,
            startTs: start,
            endTs: end,
            deptoId: depto_id,
            filialDoc,
            operacaoFilter,
            selectedCfops,
            search,
            tipo,
            apenasNfeEfetivo,
            hasChaveNfe,
        });
        params[0] = tenantId;

        const limitIdx = params.length + 1;
        const offsetIdx = params.length + 2;
        const combinedNotasRes = await db.query(
            `${cteSql},
             totals_agg AS (
                 SELECT
                     COUNT(*) AS total,
                     COALESCE(SUM(valor_produtos) FILTER (WHERE tipo_operacao = 'SAIDA' AND cfop !~ '^[123]'), 0) AS soma_saidas_brutas_produtos,
                     COALESCE(SUM(valor_total) FILTER (WHERE tipo_operacao = 'SAIDA' AND cfop !~ '^[123]'), 0) AS soma_saidas_brutas_valor,
                     COALESCE(SUM(valor_produtos) FILTER (WHERE tipo_operacao = 'SAIDA' AND cfop ~ '^[123]'), 0) AS soma_devolucoes_produtos,
                     COALESCE(SUM(CASE WHEN tipo_operacao = 'SAIDA' AND cfop ~ '^[123]' THEN -valor_produtos ELSE valor_produtos END), 0) AS soma_valor_produtos,
                     COALESCE(SUM(CASE WHEN tipo_operacao = 'SAIDA' AND cfop ~ '^[123]' THEN -valor_total ELSE valor_total END), 0) AS soma_valor,
                     COALESCE(SUM(valor_total) FILTER (WHERE tipo_operacao = 'SAIDA' AND cfop ~ '^[123]'), 0) AS soma_devolucoes,
                     COUNT(*) FILTER (WHERE tipo_operacao = 'SAIDA' AND cfop ~ '^[123]') AS qtd_devolucoes
                 FROM notas_filtradas
             ),
             paged_rows AS (
                 SELECT COALESCE(json_agg(t), '[]'::json) AS rows
                 FROM (
                     SELECT *
                     FROM notas_filtradas
                     ORDER BY data_emissao DESC, registro_id DESC
                     LIMIT $${limitIdx} OFFSET $${offsetIdx}
                 ) t
             )
             SELECT
                 (SELECT row_to_json(totals_agg) FROM totals_agg) AS totals,
                 (SELECT rows FROM paged_rows) AS rows`,
            [...params, limit, offset]
        );

        const totalsRow = combinedNotasRes.rows[0]?.totals || {};
        const total = parseInt(totalsRow.total || 0, 10);
        const somaSaidasBrutasProdutos = parseFloat(totalsRow.soma_saidas_brutas_produtos || 0);
        const somaSaidasBrutasValor = parseFloat(totalsRow.soma_saidas_brutas_valor || 0);
        const somaDevolucoesProdutos = parseFloat(totalsRow.soma_devolucoes_produtos || 0);
        const somaValorProdutos = parseFloat(totalsRow.soma_valor_produtos || 0);
        const somaValor = parseFloat(totalsRow.soma_valor || 0);
        const somaDescontos = Math.max(0, Number((somaValorProdutos - somaValor).toFixed(2)));
        const somaDevolucoes = parseFloat(totalsRow.soma_devolucoes || 0);
        const qtdDevolucoes = parseInt(totalsRow.qtd_devolucoes || 0, 10);

        const rows = Array.isArray(combinedNotasRes.rows[0]?.rows) ? combinedNotasRes.rows[0].rows : [];

        // Enriquecer qtd_itens, CFOP, numero_nota, serie e chave_nfe a partir de dash_vendas_itens e dash_cargas na página atual
        const vendaIds = rows.filter((r) => r.origem === 'vendas').map((r) => Number(r.registro_id));
        const vendaStatsMap = new Map();
        const vendaCargasMap = new Map();
        if (vendaIds.length > 0) {
            const vendaIdTexts = vendaIds.map(String);
            const [statsRes, cargasRes] = await Promise.all([
                db.query(
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
                ),
                db.query(
                    `SELECT
                        (cg.dados_nfe->>'id_pedido') AS id_pedido,
                        COALESCE(NULLIF(TRIM(cg.numero), ''), NULLIF(TRIM(cg.dados_nfe->>'numero_nota'), '')) AS numero_nota,
                        COALESCE(NULLIF(TRIM(cg.serie), ''), NULLIF(TRIM(cg.dados_nfe->>'serie'), ''), '1') AS serie,
                        COALESCE(NULLIF(TRIM(cg.chave_acesso), ''), NULLIF(TRIM(cg.dados_nfe->>'chave_nfe'), '')) AS chave_nfe,
                        regexp_replace(COALESCE(NULLIF(TRIM(cg.dados_nfe->'itens'->0->>'cfop'), ''), ''), '\\D', '', 'g') AS cfop,
                        NULLIF(TRIM(cg.dados_nfe->>'natureza_operacao'), '') AS natureza_operacao,
                        COALESCE(
                            CASE WHEN (cg.dados_nfe->>'qtd_itens') ~ '^[0-9]+$' THEN (cg.dados_nfe->>'qtd_itens')::int ELSE NULL END,
                            CASE WHEN jsonb_typeof(cg.dados_nfe->'itens') = 'array' THEN jsonb_array_length(cg.dados_nfe->'itens') ELSE 0 END
                        )::int AS qtd_itens
                     FROM dash_cargas cg
                     WHERE cg.tenant_id = $1
                       AND (cg.dados_nfe->>'id_pedido') IS NOT NULL
                       AND (cg.dados_nfe->>'id_pedido') = ANY($2::text[])
                       AND UPPER(COALESCE(cg.dados_nfe->>'natureza_operacao', '')) NOT LIKE '%COMPRA%'`,
                    [tenantId, vendaIdTexts]
                ),
            ]);
            for (const st of statsRes.rows) {
                vendaStatsMap.set(Number(st.venda_id_firebird), {
                    qtd_itens: parseInt(st.qtd_itens || 0, 10),
                    cfop: st.item_cfop && st.item_cfop !== '0' ? st.item_cfop : '',
                    numero_nota: st.item_numero_nota || null,
                    chave_nfe: st.item_chave_nfe || null,
                });
            }
            for (const cg of cargasRes.rows) {
                const pid = Number(cg.id_pedido);
                if (!isNaN(pid) && !vendaCargasMap.has(pid)) {
                    vendaCargasMap.set(pid, cg);
                }
            }
        }

        const data = rows.map((r) => {
            const extra = r.origem === 'vendas' ? vendaStatsMap.get(Number(r.registro_id)) : null;
            const cgExtra = r.origem === 'vendas' ? vendaCargasMap.get(Number(r.registro_id)) : null;
            const resolvedChave = r.chave_nfe || cgExtra?.chave_nfe || extra?.chave_nfe || null;
            const hasHeaderNf = r.modelo_doc === 'NF-e / NFC-e';
            const resolvedNumeroNota = (hasHeaderNf || r.origem === 'cargas')
                ? r.numero_nota
                : (cgExtra?.numero_nota || extra?.numero_nota || r.numero_nota);
            const resolvedModelo = r.origem === 'cargas'
                ? r.modelo_doc
                : (cgExtra ? 'NF-e (XML)' : ((hasHeaderNf || extra?.numero_nota || resolvedChave) ? 'NF-e / NFC-e' : r.modelo_doc));

            return {
                origem: r.origem,
                registro_id: Number(r.registro_id),
                tipo_operacao: r.tipo_operacao,
                modelo_doc: resolvedModelo,
                numero_nota: resolvedNumeroNota,
                serie: cgExtra?.serie || r.serie,
                numero_pedido: r.numero_pedido,
                chave_nfe: resolvedChave,
                data_emissao: r.data_emissao,
                parceiro_nome: r.parceiro_nome,
                parceiro_documento: r.parceiro_documento,
                cidade: r.cidade,
                uf: r.uf,
                cfop: r.cfop || cgExtra?.cfop || extra?.cfop || '',
                natureza_operacao: r.natureza_operacao,
                valor_produtos: parseFloat(r.valor_produtos || r.valor_total || 0),
                valor_total: parseFloat(r.valor_total || 0),
                status: r.status,
                qtd_itens: r.origem === 'vendas'
                    ? (extra?.qtd_itens || cgExtra?.qtd_itens || 0)
                    : parseInt(r.qtd_itens || 0, 10),
            };
        });

        const payload = {
            tipo,
            apenas_nfe: apenasNfeSolicitado,
            apenas_nfe_efetivo: apenasNfeEfetivo,
            has_synced_nf: hasSyncedNf,
            total,
            soma_saidas_brutas_produtos: somaSaidasBrutasProdutos,
            soma_saidas_brutas_valor: somaSaidasBrutasValor,
            soma_devolucoes_produtos: somaDevolucoesProdutos,
            soma_valor_produtos: somaValorProdutos,
            soma_descontos: somaDescontos,
            soma_valor: somaValor,
            soma_devolucoes: somaDevolucoes,
            qtd_devolucoes: qtdDevolucoes,
            page,
            limit,
            total_pages: Math.max(1, Math.ceil(total / limit)),
            data,
        };
        setFiscalCache(cacheKey, payload);
        res.json(payload);
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
        await ensureFiscalColumns();
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
            const natUpper = String(nfe.natureza_operacao || '').trim().toUpperCase();
            const rawItens = Array.isArray(nfe.itens) ? nfe.itens : [];
            const cfop0 = String(rawItens[0]?.cfop || '').replace(/\D/g, '');
            const rawTipoOp = String(nfe.tipo_operacao || 'SAIDA').trim().toUpperCase();

            const isCompraComercial = rawTipoOp === 'SAIDA'
                && (
                    natUpper.includes('COMPRA')
                    || natUpper.startsWith('ENTRADA DE MERCADORIA')
                    || natUpper.startsWith('ENTRADA DE BONIFICA')
                    || natUpper.startsWith('ENTRADA BONIFICA')
                    || natUpper.startsWith('OUTRA ENTRADA')
                    || natUpper.startsWith('OUTRAS ENTRADA')
                )
                && !natUpper.includes('DEVOLU');
            const isSaidaCfop = !isCompraComercial && (
                /^[567]/.test(cfop0)
                || (!cfop0 && (natUpper.includes('VENDA') || natUpper.includes('SAIDA') || natUpper.includes('SAÍDA')) && !natUpper.includes('DEVOLU'))
            );
            const isEntrada = !isSaidaCfop && (isCompraComercial || rawTipoOp === 'ENTRADA' || /^[123]/.test(cfop0));

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

            const totalDescontoItens = itens.reduce((acc, i) => acc + i.desconto, 0);
            const valProd = parseFloat(cg.valor_produtos || cg.valor_total || 0);
            const valTotRaw = parseFloat(cg.valor_total || 0);
            const valorTotalEfetivo = (isCompraComercial && valProd > 0 && (valTotRaw - valProd) > 10 && ['1403', '2403'].includes(cfop0) && totalDescontoItens === 0)
                ? valProd
                : valTotRaw;

            // Em dash_cargas, quando rawTipoOp === 'ENTRADA' e é uma nota de saída por Ajuste (CFOP 5xxx/6xxx),
            // o sincronizador colocou a Filial em destinatario_* e o Cliente em remetente_*.
            const swapParties = isCompraComercial || (isSaidaCfop && rawTipoOp === 'ENTRADA');

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
                natureza_operacao: nfe.natureza_operacao || (isEntrada ? 'Compra / Entrada de Mercadoria' : 'Venda de Mercadoria'),
                data_emissao: cg.data_emissao,
                status: cg.status || 'AUTORIZADA',
                valor_produtos: valProd,
                valor_frete: parseFloat(nfe.valor_frete || 0),
                valor_desconto: totalDescontoItens,
                valor_total: valorTotalEfetivo,
                remetente: swapParties
                    ? {
                        nome: cg.destinatario_nome || '-',
                        documento: cg.destinatario_documento || '',
                        municipio: cg.destinatario_municipio || '',
                        uf: cg.destinatario_uf || '',
                    }
                    : {
                        nome: cg.remetente_nome || '-',
                        documento: cg.remetente_documento || '',
                        municipio: cg.remetente_municipio || '',
                        uf: cg.remetente_uf || '',
                    },
                destinatario: swapParties
                    ? {
                        nome: cg.remetente_nome || '-',
                        documento: cg.remetente_documento || '',
                        municipio: cg.remetente_municipio || '',
                        uf: cg.remetente_uf || '',
                    }
                    : {
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
        const cliTipoUpper = String(v.cliente_tipo || '1').trim().toUpperCase();
        const isEntrada = v.es === 2
            && Number(v.processo || 1) !== 2
            && parseFloat(v.valor_total || 0) > 0
            && ['FORNECEDOR', 'FORNECEDORES', 'FORNEC'].includes(cliTipoUpper);

        const [itemRes, cargaRes] = await Promise.all([
            db.query(
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
            ),
            db.query(
                `SELECT *
                 FROM dash_cargas cg
                 WHERE cg.tenant_id = $1
                   AND (cg.dados_nfe->>'id_pedido') IS NOT NULL
                   AND (cg.dados_nfe->>'id_pedido') = $2::text
                   AND UPPER(COALESCE(cg.dados_nfe->>'natureza_operacao', '')) NOT LIKE '%COMPRA%'
                 ORDER BY cg.id DESC
                 LIMIT 1`,
                [tenantId, String(idNum)]
            ),
        ]);

        const itemRows = itemRes.rows;
        const cgMatch = cargaRes.rows[0] || null;
        const cgNfe = cgMatch && cgMatch.dados_nfe && typeof cgMatch.dados_nfe === 'object' ? cgMatch.dados_nfe : {};
        const cgItens = Array.isArray(cgNfe.itens) ? cgNfe.itens : [];

        const firstItemNf = itemRows.find((i) => i.item_numero_nota)?.item_numero_nota || null;
        const firstItemChave = itemRows.find((i) => i.item_chave_nfe)?.item_chave_nfe || null;
        const firstItemCfop = itemRows.find((i) => i.cfop)?.cfop || String(cgItens[0]?.cfop || '').replace(/\D/g, '') || '';

        const itens = itemRows.length > 0
            ? itemRows.map((it, idx) => {
                const bruto = parseFloat(it.valor_total || 0);
                const descPct = parseFloat(it.desconto_pct || 0);
                const descVal = descPct > 0 ? bruto * (descPct / 100) : 0;
                const xmlItem = cgItens[idx] || {};
                return {
                    ordem: idx + 1,
                    codigo: it.codigo || xmlItem.codigo || String(idx + 1),
                    descricao: it.descricao,
                    ncm: xmlItem.ncm || '',
                    cst: xmlItem.cst || '',
                    cfop: it.cfop || xmlItem.cfop || '',
                    unidade: xmlItem.unidade || 'UN',
                    quantidade: parseFloat(it.quantidade || 0),
                    valor_unitario: parseFloat(it.valor_unitario || 0),
                    desconto: descVal,
                    valor_total: bruto - descVal,
                };
            })
            : cgItens.map((it, idx) => ({
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

        const parceiroNome = v.cliente_nome || cgMatch?.destinatario_nome || (isEntrada ? 'Fornecedor' : 'Consumidor Final');
        const empresaNome = v.filial_nome || cgMatch?.remetente_nome || 'Empresa Emitente';
        const resolvedChave = (v.chave_nfe && String(v.chave_nfe).trim())
            || cgMatch?.chave_acesso
            || cgNfe.chave_nfe
            || firstItemChave
            || null;
        const resolvedNumeroNota = (v.numero_nota && Number(v.numero_nota) > 0)
            ? String(v.numero_nota)
            : (cgMatch?.numero || cgNfe.numero_nota || firstItemNf || v.numero_pedido || String(v.id_firebird));
        const hasNfMetadata = Boolean((v.numero_nota && Number(v.numero_nota) > 0) || cgMatch || firstItemNf || resolvedChave);
        const resolvedNatureza = resolveVendaNaturezaJs(v, isEntrada, firstItemCfop);

        return res.json({
            origem: 'vendas',
            registro_id: Number(v.id_firebird),
            tipo_operacao: isEntrada ? 'ENTRADA' : 'SAIDA',
            modelo_doc: cgMatch ? 'NF-e (XML)' : (hasNfMetadata ? 'NF-e / NFC-e' : (isEntrada ? 'Entrada ERP' : 'Faturado ERP')),
            numero_nota: resolvedNumeroNota,
            serie: cgMatch?.serie || cgNfe.serie || '1',
            numero_pedido: v.numero_pedido || String(v.id_firebird),
            chave_nfe: resolvedChave,
            protocolo: cgNfe.protocolo || null,
            natureza_operacao: resolvedNatureza,
            data_emissao: isEntrada ? (v.data_hora_proc || v.data_venda) : (v.data_hora_proc || v.data_vencimento || v.data_venda),
            status: v.status || (isEntrada ? 'RECEBIDA' : 'FATURADO'),
            vendedor_nome: v.vendedor_nome || null,
            valor_produtos: parseFloat(v.valor_total || 0),
            valor_frete: parseFloat(cgNfe.valor_frete || 0),
            valor_desconto: Math.abs(parseFloat(v.valor_desconto || 0)),
            valor_total: parseFloat(v.valor_total || 0) - parseFloat(v.valor_desconto || 0),
            remetente: isEntrada
                ? {
                    nome: parceiroNome,
                    documento: v.cliente_documento || '',
                    municipio: v.cliente_cidade || '',
                    uf: v.cliente_uf || '',
                }
                : {
                    nome: empresaNome,
                    documento: v.filial_documento || cgMatch?.remetente_documento || '',
                    municipio: cgMatch?.remetente_municipio || '',
                    uf: cgMatch?.remetente_uf || '',
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
                    documento: v.cliente_documento || cgMatch?.destinatario_documento || '',
                    municipio: v.cliente_cidade || cgMatch?.destinatario_municipio || '',
                    uf: v.cliente_uf || cgMatch?.destinatario_uf || '',
                },
            transporte: {
                transportadora_nome: cgNfe.transportadora_nome || null,
                transportadora_documento: cgNfe.transportadora_documento || null,
                placa: cgNfe.veiculo_placa || null,
                uf: cgNfe.veiculo_uf || null,
                volumes: cgMatch?.volumes || null,
                especie: v.especie || cgMatch?.especie || null,
                peso_bruto: parseFloat(cgMatch?.peso_bruto || 0),
                peso_liquido: parseFloat(cgMatch?.peso_liquido || 0),
            },
            itens,
        });
    } catch (err) {
        next(err);
    }
});

module.exports = router;

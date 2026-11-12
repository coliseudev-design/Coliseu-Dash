'use strict';

const db = require('../db/postgres');
const logger = require('../config/logger');
const { invalidateTenant } = require('../config/cache');

const settingsCache = new Map();
const userSettingsCache = new Map();
const nfCoverageCache = new Map();
const availableCfopsCache = new Map();
const SETTINGS_TTL_MS = 60 * 1000;
const NF_COVERAGE_TTL_MS = 60 * 1000;
let tableEnsured = false;

const CFOP_LABELS = {
    '5101': 'Venda de produção do estabelecimento',
    '5102': 'Venda de mercadoria adquirida ou recebida de terceiros',
    '5117': 'Venda de mercadoria originada de encomenda para entrega futura',
    '5401': 'Venda de produção em operação com substituição tributária',
    '5403': 'Venda de mercadoria em operação com substituição tributária (contribuinte substituto)',
    '5405': 'Venda de mercadoria adquirida/recebida de terceiros ST (substituído)',
    '5910': 'Remessa em bonificação, doação ou brinde',
    '5922': 'Lançamento efetuado a título de simples faturamento decorrente de venda para entrega futura',
    '5929': 'Lançamento relativo a operação registrada em ECF / Cupom Fiscal',
    '5949': 'Outra saída de mercadoria ou prestação de serviço não especificado (Ajuste / Transferência / Remessa)',
    '6101': 'Venda de produção do estabelecimento (Interestadual)',
    '6102': 'Venda de mercadoria adquirida ou recebida de terceiros (Interestadual)',
    '6108': 'Venda de mercadoria adquirida/recebida de terceiros a não contribuinte (Interestadual)',
    '6403': 'Venda de mercadoria sujeita a ST (Interestadual)',
    '6404': 'Venda de mercadoria sujeita a ST (Interestadual - Substituído)',
    '6949': 'Outra saída de mercadoria ou prestação de serviço não especificado (Interestadual)',
    '1201': 'Devolução de venda de produção do estabelecimento',
    '1202': 'Devolução de venda de mercadoria adquirida ou recebida de terceiros',
    '1411': 'Devolução de venda de mercadoria sujeita ao regime de substituição tributária',
    '2202': 'Devolução de venda de mercadoria (Interestadual)',
    '2411': 'Devolução de venda de mercadoria sujeita a ST (Interestadual)',
    '1102': 'Compra para comercialização',
    '2102': 'Compra para comercialização (Interestadual)',
    '1403': 'Compra para comercialização em operação com mercadoria sujeita a ST',
    '2403': 'Compra para comercialização sujeita a ST (Interestadual)',
    '1556': 'Compra de material para uso ou consumo',
    '2556': 'Compra de material para uso ou consumo (Interestadual)',
    '1949': 'Outra entrada de mercadoria ou prestação de serviço não especificado',
    '2949': 'Outra entrada de mercadoria ou prestação de serviço não especificado (Interestadual)',
};

function normalizeCfopList(list) {
    if (!Array.isArray(list)) return null;
    const cleaned = Array.from(
        new Set(
            list
                .map((c) => String(c || '').replace(/\D/g, '').trim())
                .filter((c) => c.length === 4)
        )
    );
    return cleaned.length > 0 ? cleaned : null;
}

async function ensureSettingsTable() {
    if (tableEnsured) return;
    await db.query(`
        CREATE TABLE IF NOT EXISTS dash_configuracoes_tenant (
            tenant_id UUID PRIMARY KEY,
            somente_vendas_com_nf BOOLEAN NOT NULL DEFAULT FALSE,
            cfops_faturamento JSONB DEFAULT NULL,
            updated_at TIMESTAMPTZ DEFAULT NOW(),
            updated_by VARCHAR(200)
        );
        ALTER TABLE dash_configuracoes_tenant ADD COLUMN IF NOT EXISTS cfops_faturamento JSONB DEFAULT NULL;
        CREATE TABLE IF NOT EXISTS dash_configuracoes_usuario (
            tenant_id UUID NOT NULL,
            user_key VARCHAR(255) NOT NULL,
            somente_vendas_com_nf BOOLEAN NOT NULL DEFAULT FALSE,
            cfops_faturamento JSONB DEFAULT NULL,
            updated_at TIMESTAMPTZ DEFAULT NOW(),
            PRIMARY KEY (tenant_id, user_key)
        );
        ALTER TABLE dash_configuracoes_usuario ADD COLUMN IF NOT EXISTS cfops_faturamento JSONB DEFAULT NULL;
    `);
    tableEnsured = true;
}

/**
 * Verifica de forma ultrarrápida (EXISTS LIMIT 1 + cache 60s) se o tenant possui
 * ao menos uma venda ou carga XML com Nota Fiscal sincronizada no PostgreSQL,
 * além de identificar se a coluna chave_nfe está preenchida nas vendas faturadas.
 * Evita zerar todos os painéis em empresas cujo SyncAgent ainda não envia numero_nota/chave_nfe.
 * @param {string} tenantId
 * @returns {Promise<{ hasSyncedNf: boolean, hasChaveNfe: boolean }>}
 */
async function checkTenantNfCoverage(tenantId) {
    if (!tenantId || tenantId === '00000000-0000-0000-0000-000000000000') {
        return { hasSyncedNf: false, hasChaveNfe: false };
    }

    const cached = nfCoverageCache.get(tenantId);
    if (cached && cached.expiresAt > Date.now()) {
        return {
            hasSyncedNf: Boolean(cached.hasSyncedNf),
            hasChaveNfe: Boolean(cached.hasChaveNfe),
        };
    }

    try {
        const { rows } = await db.query(
            `SELECT
                EXISTS (
                    SELECT 1 FROM dash_vendas
                    WHERE tenant_id = $1
                      AND chave_nfe IS NOT NULL
                      AND LENGTH(TRIM(chave_nfe)) >= 40
                    LIMIT 1
                ) AS has_chave_nfe,
                (
                    EXISTS (
                        SELECT 1 FROM dash_vendas
                        WHERE tenant_id = $1
                          AND (
                              (numero_nota IS NOT NULL AND numero_nota > 0)
                              OR (chave_nfe IS NOT NULL AND TRIM(chave_nfe) <> '')
                          )
                        LIMIT 1
                    )
                    OR EXISTS (
                        SELECT 1 FROM dash_cargas
                        WHERE tenant_id = $1
                        LIMIT 1
                    )
                    OR EXISTS (
                        SELECT 1 FROM dash_vendas_itens
                        WHERE tenant_id = $1
                          AND (
                              (numero_nota IS NOT NULL AND TRIM(numero_nota::text) NOT IN ('', '0'))
                              OR (chave_nfe IS NOT NULL AND TRIM(chave_nfe) <> '')
                          )
                        LIMIT 1
                    )
                ) AS has_synced_nf`,
            [tenantId]
        );

        const hasSyncedNf = Boolean(rows[0]?.has_synced_nf);
        const hasChaveNfe = Boolean(rows[0]?.has_chave_nfe);
        nfCoverageCache.set(tenantId, {
            hasSyncedNf,
            hasChaveNfe,
            expiresAt: Date.now() + NF_COVERAGE_TTL_MS,
        });
        return { hasSyncedNf, hasChaveNfe };
    } catch (err) {
        try {
            const { rows } = await db.query(
                `SELECT
                    EXISTS (
                        SELECT 1 FROM dash_vendas
                        WHERE tenant_id = $1
                          AND chave_nfe IS NOT NULL
                          AND LENGTH(TRIM(chave_nfe)) >= 40
                        LIMIT 1
                    ) AS has_chave_nfe,
                    EXISTS (
                        SELECT 1 FROM dash_vendas
                        WHERE tenant_id = $1
                          AND (
                              (numero_nota IS NOT NULL AND numero_nota > 0)
                              OR (chave_nfe IS NOT NULL AND TRIM(chave_nfe) <> '')
                          )
                        LIMIT 1
                    ) AS has_synced_nf`,
                [tenantId]
            );
            const hasSyncedNf = Boolean(rows[0]?.has_synced_nf);
            const hasChaveNfe = Boolean(rows[0]?.has_chave_nfe);
            nfCoverageCache.set(tenantId, {
                hasSyncedNf,
                hasChaveNfe,
                expiresAt: Date.now() + NF_COVERAGE_TTL_MS,
            });
            return { hasSyncedNf, hasChaveNfe };
        } catch (innerErr) {
            logger.warn('[TenantSettings] Falha ao checar cobertura de NF do tenant', {
                tenantId,
                error: innerErr.message,
            });
            return { hasSyncedNf: false, hasChaveNfe: false };
        }
    }
}

async function checkTenantHasSyncedNf(tenantId) {
    const cov = await checkTenantNfCoverage(tenantId);
    return cov.hasSyncedNf;
}

function invalidateTenantSettingsCache(tenantId) {
    if (!tenantId) return;
    settingsCache.delete(tenantId);
    nfCoverageCache.delete(tenantId);
    availableCfopsCache.delete(tenantId);
}

/**
 * Retorna a lista de todos os CFOPs disponíveis nas notas fiscais emitidas pelo tenant,
 * com quantidade de notas, valor dos produtos e valor total das notas.
 * @param {string} tenantId
 */
async function getAvailableTenantCfops(tenantId) {
    if (!tenantId || tenantId === '00000000-0000-0000-0000-000000000000') {
        return [];
    }
    const cached = availableCfopsCache.get(tenantId);
    if (cached && cached.expiresAt > Date.now()) {
        return cached.data;
    }

    try {
        const { rows } = await db.query(
            `WITH tenant_docs AS (
                SELECT DISTINCT regexp_replace(COALESCE(documento, ''), '\\D', '', 'g') AS doc
                FROM dash_filiais
                WHERE tenant_id = $1
                  AND LENGTH(regexp_replace(COALESCE(documento, ''), '\\D', '', 'g')) >= 11
            ),
            cargas_nfe_keys AS (
                SELECT DISTINCT TRIM(chave_acesso) AS chave
                FROM dash_cargas
                WHERE tenant_id = $1
                  AND chave_acesso IS NOT NULL
                  AND TRIM(chave_acesso) <> ''
                  AND COALESCE(status, '') NOT IN ('CANCELADA', 'CANCELADO', 'DENEGADA', 'INUTILIZADA')
            ),
            cargas_ped_ids AS (
                SELECT DISTINCT TRIM(id_pedido) AS pid
                FROM dash_cargas
                WHERE tenant_id = $1
                  AND id_pedido IS NOT NULL
                  AND TRIM(id_pedido) <> ''
                  AND COALESCE(status, '') NOT IN ('CANCELADA', 'CANCELADO', 'DENEGADA', 'INUTILIZADA')
            ),
            notas_emitidas AS (
                SELECT
                    COALESCE(
                        NULLIF(regexp_replace(COALESCE(cg.dados_nfe->>'cfop', cg.dados_nfe->'itens'->0->>'cfop', ''), '\\D', '', 'g'), ''),
                        '5102'
                    ) AS cfop,
                    COALESCE(NULLIF(TRIM(COALESCE(cg.dados_nfe->>'nat_op', cg.dados_nfe->>'natureza_operacao')), ''), 'OPERAÇÃO FISCAL') AS natureza,
                    COALESCE(cg.valor_produtos, cg.valor_total, 0)::numeric(15,2) AS valor_produtos,
                    COALESCE(cg.valor_total, 0)::numeric(15,2) AS valor_total
                FROM dash_cargas cg
                WHERE cg.tenant_id = $1
                  AND COALESCE(cg.status, '') NOT IN ('CANCELADA', 'CANCELADO', 'DENEGADA', 'INUTILIZADA')
                  AND SUBSTRING(regexp_replace(COALESCE(cg.chave_acesso, ''), '\\D', '', 'g') FROM 7 FOR 14) IN (SELECT doc FROM tenant_docs)
                  AND NOT (
                      UPPER(TRIM(COALESCE(cg.dados_nfe->>'nat_op', cg.dados_nfe->>'natureza_operacao', ''))) LIKE 'COMPRA %'
                      OR UPPER(TRIM(COALESCE(cg.dados_nfe->>'nat_op', cg.dados_nfe->>'natureza_operacao', ''))) LIKE 'AQUISICAO %'
                      OR UPPER(TRIM(COALESCE(cg.dados_nfe->>'nat_op', cg.dados_nfe->>'natureza_operacao', ''))) LIKE 'AQUISIÇÃO %'
                      OR LEFT(regexp_replace(COALESCE(cg.dados_nfe->>'cfop', cg.dados_nfe->'itens'->0->>'cfop', ''), '\\D', '', 'g'), 4) IN ('1101', '1102', '2101', '2102', '1401', '1403', '2401', '2403', '1551', '2551', '1556', '2556', '1653', '2653')
                  )
                UNION ALL
                SELECT
                    COALESCE(NULLIF(regexp_replace(COALESCE(v.cfop::text, ''), '\\D', '', 'g'), ''), '5102') AS cfop,
                    COALESCE(NULLIF(TRIM(v.natureza_operacao), ''), 'VENDA DE MERCADORIA') AS natureza,
                    COALESCE(v.valor_total, 0)::numeric(15,2) AS valor_produtos,
                    (v.valor_total - COALESCE(v.valor_desconto, 0))::numeric(15,2) AS valor_total
                FROM dash_vendas v
                LEFT JOIN cargas_nfe_keys cnk ON cnk.chave = TRIM(v.chave_nfe)
                LEFT JOIN cargas_ped_ids cpi ON cpi.pid = v.id_firebird::text
                WHERE v.tenant_id = $1
                  AND TRIM(v.status) IN ('FATURADO', 'FINALIZADO', 'PROCESSADO')
                  AND v.chave_nfe IS NOT NULL
                  AND LENGTH(TRIM(v.chave_nfe)) >= 40
                  AND cnk.chave IS NULL
                  AND cpi.pid IS NULL
            )
            SELECT
                cfop,
                STRING_AGG(DISTINCT natureza, ' / ' ORDER BY natureza) AS naturezas,
                COUNT(*)::int AS qtd_notas,
                COALESCE(SUM(valor_produtos), 0)::numeric(15,2) AS valor_produtos,
                COALESCE(SUM(valor_total), 0)::numeric(15,2) AS valor_total
            FROM notas_emitidas
            GROUP BY cfop
            ORDER BY SUM(valor_total) DESC, cfop ASC`,
            [tenantId]
        );

        const list = rows.map((r) => ({
            cfop: String(r.cfop),
            descricao: CFOP_LABELS[String(r.cfop)] || r.naturezas || 'Operação Fiscal',
            natureza_operacao: r.naturezas || CFOP_LABELS[String(r.cfop)] || 'OPERAÇÃO FISCAL',
            qtd_notas: Number(r.qtd_notas || 0),
            valor_produtos: Number(r.valor_produtos || 0),
            valor_total: Number(r.valor_total || 0),
        }));

        availableCfopsCache.set(tenantId, {
            data: list,
            expiresAt: Date.now() + SETTINGS_TTL_MS,
        });
        return list;
    } catch (err) {
        logger.warn('[TenantSettings] Falha ao listar CFOPs disponíveis do tenant', {
            tenantId,
            error: err.message,
        });
        return [];
    }
}

/**
 * Obtém os parâmetros configurados para o tenant (com cache leve em memória de 60s).
 * @param {string} tenantId
 */
async function getTenantSettings(tenantId) {
    const defaultSettings = {
        somente_vendas_com_nf: false,
        cfops_faturamento: null,
        has_synced_nf: false,
        has_chave_nfe: false,
        efetivo_somente_nf: false,
        updated_at: null,
        updated_by: null,
    };

    if (!tenantId || tenantId === '00000000-0000-0000-0000-000000000000') {
        return defaultSettings;
    }

    const { hasSyncedNf, hasChaveNfe } = await checkTenantNfCoverage(tenantId);

    const cached = settingsCache.get(tenantId);
    if (cached && cached.expiresAt > Date.now()) {
        const somenteNf = Boolean(cached.data.somente_vendas_com_nf);
        return {
            ...cached.data,
            has_synced_nf: hasSyncedNf,
            has_chave_nfe: hasChaveNfe,
            efetivo_somente_nf: Boolean(somenteNf && hasSyncedNf),
        };
    }

    try {
        await ensureSettingsTable();
        const { rows } = await db.query(
            `SELECT somente_vendas_com_nf, cfops_faturamento, updated_at, updated_by
             FROM dash_configuracoes_tenant
             WHERE tenant_id = $1`,
            [tenantId]
        );

        const somenteNf = rows.length > 0 ? Boolean(rows[0].somente_vendas_com_nf) : false;
        const cfopsFat = rows.length > 0 ? normalizeCfopList(rows[0].cfops_faturamento) : null;
        const baseData = rows.length > 0
            ? {
                somente_vendas_com_nf: somenteNf,
                cfops_faturamento: cfopsFat,
                updated_at: rows[0].updated_at || null,
                updated_by: rows[0].updated_by || null,
            }
            : {
                somente_vendas_com_nf: false,
                cfops_faturamento: null,
                updated_at: null,
                updated_by: null,
            };

        settingsCache.set(tenantId, {
            data: baseData,
            expiresAt: Date.now() + SETTINGS_TTL_MS,
        });

        return {
            ...baseData,
            has_synced_nf: hasSyncedNf,
            has_chave_nfe: hasChaveNfe,
            efetivo_somente_nf: Boolean(somenteNf && hasSyncedNf),
        };
    } catch (err) {
        logger.warn('[TenantSettings] Falha ao consultar parâmetros do tenant; usando padrão', {
            tenantId,
            error: err.message,
        });
        return {
            ...defaultSettings,
            has_synced_nf: hasSyncedNf,
            has_chave_nfe: hasChaveNfe,
        };
    }
}

/**
 * Atualiza os parâmetros do tenant e invalida imediatamente os caches de consulta.
 * Também sincroniza o parâmetro para tenants irmãos que compartilhem o mesmo CNPJ matriz em dash_filiais.
 * @param {string} tenantId
 * @param {{ somente_vendas_com_nf?: boolean, cfops_faturamento?: string[] | null }} patch
 * @param {string} updatedBy
 */
async function updateTenantSettings(tenantId, patch, updatedBy = null) {
    await ensureSettingsTable();

    const current = await getTenantSettings(tenantId);
    const somenteVendasComNf = patch.somente_vendas_com_nf !== undefined
        ? Boolean(patch.somente_vendas_com_nf)
        : Boolean(current.somente_vendas_com_nf);
    const cfopsFaturamento = patch.cfops_faturamento !== undefined
        ? normalizeCfopList(patch.cfops_faturamento)
        : current.cfops_faturamento;
    const cfopsJson = cfopsFaturamento ? JSON.stringify(cfopsFaturamento) : null;

    const { rows } = await db.query(
        `INSERT INTO dash_configuracoes_tenant (tenant_id, somente_vendas_com_nf, cfops_faturamento, updated_at, updated_by)
         VALUES ($1, $2, $3::jsonb, NOW(), $4)
         ON CONFLICT (tenant_id)
         DO UPDATE SET
            somente_vendas_com_nf = EXCLUDED.somente_vendas_com_nf,
            cfops_faturamento = EXCLUDED.cfops_faturamento,
            updated_at = NOW(),
            updated_by = EXCLUDED.updated_by
         RETURNING somente_vendas_com_nf, cfops_faturamento, updated_at, updated_by`,
        [tenantId, somenteVendasComNf, cfopsJson, updatedBy]
    );

    // Propaga o parâmetro para tenants irmãos que possuam o mesmo CNPJ matriz em dash_filiais
    try {
        const siblingRes = await db.query(
            `SELECT DISTINCT f2.tenant_id
             FROM dash_filiais f1
             JOIN dash_filiais f2
               ON regexp_replace(COALESCE(f2.documento, ''), '\\D', '', 'g') = regexp_replace(COALESCE(f1.documento, ''), '\\D', '', 'g')
             WHERE f1.tenant_id = $1
               AND f2.tenant_id <> $1
               AND LENGTH(regexp_replace(COALESCE(f1.documento, ''), '\\D', '', 'g')) = 14`,
            [tenantId]
        );
        for (const sib of siblingRes.rows) {
            if (!sib.tenant_id) continue;
            await db.query(
                `INSERT INTO dash_configuracoes_tenant (tenant_id, somente_vendas_com_nf, cfops_faturamento, updated_at, updated_by)
                 VALUES ($1, $2, $3::jsonb, NOW(), $4)
                 ON CONFLICT (tenant_id)
                 DO UPDATE SET
                    somente_vendas_com_nf = EXCLUDED.somente_vendas_com_nf,
                    cfops_faturamento = EXCLUDED.cfops_faturamento,
                    updated_at = NOW(),
                    updated_by = EXCLUDED.updated_by`,
                [sib.tenant_id, somenteVendasComNf, cfopsJson, updatedBy]
            );
            invalidateTenantSettingsCache(sib.tenant_id);
            invalidateTenant(sib.tenant_id);
        }
    } catch (sibErr) {
        logger.warn('[TenantSettings] Aviso ao propagar configuração para tenant irmão', {
            tenantId,
            error: sibErr.message,
        });
    }

    nfCoverageCache.delete(tenantId);
    const { hasSyncedNf, hasChaveNfe } = await checkTenantNfCoverage(tenantId);
    const somenteNf = Boolean(rows[0]?.somente_vendas_com_nf);
    const savedCfops = normalizeCfopList(rows[0]?.cfops_faturamento);

    const baseData = {
        somente_vendas_com_nf: somenteNf,
        cfops_faturamento: savedCfops,
        updated_at: rows[0]?.updated_at || new Date().toISOString(),
        updated_by: rows[0]?.updated_by || updatedBy,
    };

    settingsCache.set(tenantId, {
        data: baseData,
        expiresAt: Date.now() + SETTINGS_TTL_MS,
    });

    invalidateTenant(tenantId);
    return {
        ...baseData,
        has_synced_nf: hasSyncedNf,
        has_chave_nfe: hasChaveNfe,
        efetivo_somente_nf: Boolean(somenteNf && hasSyncedNf),
    };
}

function normalizeUserKey(userKey) {
    if (!userKey) return null;
    const clean = String(userKey).trim().toLowerCase();
    return clean.length > 0 ? clean : null;
}

/**
 * Obtém os parâmetros efetivos para o usuário logado (estritamente isolado por usuário em dash_configuracoes_usuario).
 * Nunca herda o estado nem o updated_by de outro usuário ou da tabela global antiga para o toggle Fiscal/Gerencial,
 * mas inclui os CFOPs configurados no projeto (cfops_faturamento).
 * @param {string} tenantId
 * @param {string|null} userKey
 * @param {boolean|null} sessionOverride
 */
async function getUserSettings(tenantId, userKey = null, sessionOverride = null) {
    const { hasSyncedNf, hasChaveNfe } = await checkTenantNfCoverage(tenantId);
    const normUser = normalizeUserKey(userKey);

    if (!tenantId || tenantId === '00000000-0000-0000-0000-000000000000') {
        return {
            somente_vendas_com_nf: false,
            cfops_faturamento: null,
            has_synced_nf: hasSyncedNf,
            has_chave_nfe: hasChaveNfe,
            efetivo_somente_nf: false,
            updated_at: null,
            updated_by: normUser,
            escopo: 'usuario'
        };
    }

    const tenantSettings = await getTenantSettings(tenantId);
    const tenantCfops = tenantSettings?.cfops_faturamento || null;

    if (normUser) {
        const cacheKey = `${tenantId}:${normUser}`;
        const cached = userSettingsCache.get(cacheKey);
        if (cached && cached.expiresAt > Date.now()) {
            const somenteNf = typeof sessionOverride === 'boolean'
                ? sessionOverride
                : Boolean(cached.data.somente_vendas_com_nf);
            const effectiveCfops = cached.data.cfops_faturamento || tenantCfops;
            return {
                somente_vendas_com_nf: somenteNf,
                cfops_faturamento: effectiveCfops,
                has_synced_nf: hasSyncedNf,
                has_chave_nfe: hasChaveNfe,
                efetivo_somente_nf: Boolean(somenteNf && hasSyncedNf),
                updated_at: cached.data.updated_at || null,
                updated_by: cached.data.updated_at ? normUser : null,
                escopo: 'usuario'
            };
        }

        try {
            await ensureSettingsTable();
            const { rows } = await db.query(
                `SELECT somente_vendas_com_nf, cfops_faturamento, updated_at
                 FROM dash_configuracoes_usuario
                 WHERE tenant_id = $1 AND user_key = $2`,
                [tenantId, normUser]
            );

            if (rows.length > 0) {
                const dbSomenteNf = Boolean(rows[0].somente_vendas_com_nf);
                const dbCfops = normalizeCfopList(rows[0].cfops_faturamento);
                const uData = {
                    somente_vendas_com_nf: dbSomenteNf,
                    cfops_faturamento: dbCfops,
                    updated_at: rows[0].updated_at || null,
                };
                userSettingsCache.set(cacheKey, {
                    data: uData,
                    expiresAt: Date.now() + SETTINGS_TTL_MS,
                });
                const effectiveToggle = typeof sessionOverride === 'boolean' ? sessionOverride : dbSomenteNf;
                return {
                    somente_vendas_com_nf: effectiveToggle,
                    cfops_faturamento: dbCfops || tenantCfops,
                    has_synced_nf: hasSyncedNf,
                    has_chave_nfe: hasChaveNfe,
                    efetivo_somente_nf: Boolean(effectiveToggle && hasSyncedNf),
                    updated_at: uData.updated_at,
                    updated_by: normUser,
                    escopo: 'usuario'
                };
            } else {
                const defaultUserData = {
                    somente_vendas_com_nf: false,
                    cfops_faturamento: null,
                    updated_at: null,
                };
                userSettingsCache.set(cacheKey, {
                    data: defaultUserData,
                    expiresAt: Date.now() + SETTINGS_TTL_MS,
                });
            }
        } catch (err) {
            logger.warn('[TenantSettings] Falha ao consultar parâmetros do usuário; usando padrão Gerencial (false)', {
                tenantId,
                userKey: normUser,
                error: err.message,
            });
        }
    }

    const fallbackToggle = typeof sessionOverride === 'boolean' ? sessionOverride : false;
    return {
        somente_vendas_com_nf: fallbackToggle,
        cfops_faturamento: tenantCfops,
        has_synced_nf: hasSyncedNf,
        has_chave_nfe: hasChaveNfe,
        efetivo_somente_nf: Boolean(fallbackToggle && hasSyncedNf),
        updated_at: null,
        updated_by: null,
        escopo: 'usuario'
    };
}

/**
 * Atualiza a preferência de visão Fiscal/Gerencial individualmente para o usuário logado,
 * sem afetar os demais usuários da empresa (DEM-0028), e opcionalmente salva os CFOPs que somam no projeto.
 * @param {string} tenantId
 * @param {string} userKey
 * @param {{ somente_vendas_com_nf?: boolean, cfops_faturamento?: string[] | null }} patch
 */
async function updateUserSettings(tenantId, userKey, patch) {
    await ensureSettingsTable();
    const normUser = normalizeUserKey(userKey);
    if (!normUser) {
        return updateTenantSettings(tenantId, patch, 'admin');
    }

    const existing = await getUserSettings(tenantId, normUser, null);
    const somenteVendasComNf = patch.somente_vendas_com_nf !== undefined
        ? Boolean(patch.somente_vendas_com_nf)
        : Boolean(existing.somente_vendas_com_nf);

    let cfopsFaturamento = existing.cfops_faturamento || null;
    if (patch.cfops_faturamento !== undefined) {
        cfopsFaturamento = normalizeCfopList(patch.cfops_faturamento);
        await updateTenantSettings(tenantId, { cfops_faturamento: cfopsFaturamento }, normUser);
    }
    const cfopsJson = cfopsFaturamento ? JSON.stringify(cfopsFaturamento) : null;

    const { rows } = await db.query(
        `INSERT INTO dash_configuracoes_usuario (tenant_id, user_key, somente_vendas_com_nf, cfops_faturamento, updated_at)
         VALUES ($1, $2, $3, $4::jsonb, NOW())
         ON CONFLICT (tenant_id, user_key)
         DO UPDATE SET
            somente_vendas_com_nf = EXCLUDED.somente_vendas_com_nf,
            cfops_faturamento = EXCLUDED.cfops_faturamento,
            updated_at = NOW()
         RETURNING somente_vendas_com_nf, cfops_faturamento, updated_at`,
        [tenantId, normUser, somenteVendasComNf, cfopsJson]
    );

    const cacheKey = `${tenantId}:${normUser}`;
    const uData = {
        somente_vendas_com_nf: Boolean(rows[0]?.somente_vendas_com_nf),
        cfops_faturamento: normalizeCfopList(rows[0]?.cfops_faturamento) || cfopsFaturamento,
        updated_at: rows[0]?.updated_at || new Date().toISOString(),
    };
    userSettingsCache.set(cacheKey, {
        data: uData,
        expiresAt: Date.now() + SETTINGS_TTL_MS,
    });

    const { hasSyncedNf, hasChaveNfe } = await checkTenantNfCoverage(tenantId);
    return {
        somente_vendas_com_nf: uData.somente_vendas_com_nf,
        cfops_faturamento: uData.cfops_faturamento,
        updated_at: uData.updated_at,
        updated_by: normUser,
        has_synced_nf: hasSyncedNf,
        has_chave_nfe: hasChaveNfe,
        efetivo_somente_nf: Boolean(uData.somente_vendas_com_nf && hasSyncedNf),
        escopo: 'usuario'
    };
}

module.exports = {
    getTenantSettings,
    updateTenantSettings,
    getUserSettings,
    updateUserSettings,
    getAvailableTenantCfops,
    checkTenantHasSyncedNf,
    checkTenantNfCoverage,
    invalidateTenantSettingsCache,
};

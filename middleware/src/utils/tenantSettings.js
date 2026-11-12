'use strict';

const db = require('../db/postgres');
const logger = require('../config/logger');
const { invalidateTenant } = require('../config/cache');

const settingsCache = new Map();
const userSettingsCache = new Map();
const nfCoverageCache = new Map();
const SETTINGS_TTL_MS = 60 * 1000;
const NF_COVERAGE_TTL_MS = 60 * 1000;
let tableEnsured = false;

async function ensureSettingsTable() {
    if (tableEnsured) return;
    await db.query(`
        CREATE TABLE IF NOT EXISTS dash_configuracoes_tenant (
            tenant_id UUID PRIMARY KEY,
            somente_vendas_com_nf BOOLEAN NOT NULL DEFAULT FALSE,
            updated_at TIMESTAMPTZ DEFAULT NOW(),
            updated_by VARCHAR(200)
        );
        CREATE TABLE IF NOT EXISTS dash_configuracoes_usuario (
            tenant_id UUID NOT NULL,
            user_key VARCHAR(255) NOT NULL,
            somente_vendas_com_nf BOOLEAN NOT NULL DEFAULT FALSE,
            updated_at TIMESTAMPTZ DEFAULT NOW(),
            PRIMARY KEY (tenant_id, user_key)
        );
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
}

/**
 * Obtém os parâmetros configurados para o tenant (com cache leve em memória de 60s).
 * @param {string} tenantId
 */
async function getTenantSettings(tenantId) {
    const defaultSettings = {
        somente_vendas_com_nf: false,
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
            `SELECT somente_vendas_com_nf, updated_at, updated_by
             FROM dash_configuracoes_tenant
             WHERE tenant_id = $1`,
            [tenantId]
        );

        const somenteNf = rows.length > 0 ? Boolean(rows[0].somente_vendas_com_nf) : false;
        const baseData = rows.length > 0
            ? {
                somente_vendas_com_nf: somenteNf,
                updated_at: rows[0].updated_at || null,
                updated_by: rows[0].updated_by || null,
            }
            : {
                somente_vendas_com_nf: false,
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
 * @param {{ somente_vendas_com_nf?: boolean }} patch
 * @param {string} updatedBy
 */
async function updateTenantSettings(tenantId, patch, updatedBy = null) {
    await ensureSettingsTable();

    const somenteVendasComNf = Boolean(patch.somente_vendas_com_nf);

    const { rows } = await db.query(
        `INSERT INTO dash_configuracoes_tenant (tenant_id, somente_vendas_com_nf, updated_at, updated_by)
         VALUES ($1, $2, NOW(), $3)
         ON CONFLICT (tenant_id)
         DO UPDATE SET
            somente_vendas_com_nf = EXCLUDED.somente_vendas_com_nf,
            updated_at = NOW(),
            updated_by = EXCLUDED.updated_by
         RETURNING somente_vendas_com_nf, updated_at, updated_by`,
        [tenantId, somenteVendasComNf, updatedBy]
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
                `INSERT INTO dash_configuracoes_tenant (tenant_id, somente_vendas_com_nf, updated_at, updated_by)
                 VALUES ($1, $2, NOW(), $3)
                 ON CONFLICT (tenant_id)
                 DO UPDATE SET
                    somente_vendas_com_nf = EXCLUDED.somente_vendas_com_nf,
                    updated_at = NOW(),
                    updated_by = EXCLUDED.updated_by`,
                [sib.tenant_id, somenteVendasComNf, updatedBy]
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

    const baseData = {
        somente_vendas_com_nf: somenteNf,
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
 * Nunca herda o estado nem o updated_by de outro usuário ou da tabela global antiga.
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
            has_synced_nf: hasSyncedNf,
            has_chave_nfe: hasChaveNfe,
            efetivo_somente_nf: false,
            updated_at: null,
            updated_by: normUser,
            escopo: 'usuario'
        };
    }

    if (normUser) {
        const cacheKey = `${tenantId}:${normUser}`;
        const cached = userSettingsCache.get(cacheKey);
        if (cached && cached.expiresAt > Date.now()) {
            const somenteNf = typeof sessionOverride === 'boolean'
                ? sessionOverride
                : Boolean(cached.data.somente_vendas_com_nf);
            return {
                somente_vendas_com_nf: somenteNf,
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
                `SELECT somente_vendas_com_nf, updated_at
                 FROM dash_configuracoes_usuario
                 WHERE tenant_id = $1 AND user_key = $2`,
                [tenantId, normUser]
            );

            if (rows.length > 0) {
                const dbSomenteNf = Boolean(rows[0].somente_vendas_com_nf);
                const uData = {
                    somente_vendas_com_nf: dbSomenteNf,
                    updated_at: rows[0].updated_at || null,
                };
                userSettingsCache.set(cacheKey, {
                    data: uData,
                    expiresAt: Date.now() + SETTINGS_TTL_MS,
                });
                const effectiveToggle = typeof sessionOverride === 'boolean' ? sessionOverride : dbSomenteNf;
                return {
                    somente_vendas_com_nf: effectiveToggle,
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
 * sem afetar os demais usuários da empresa (DEM-0028).
 * @param {string} tenantId
 * @param {string} userKey
 * @param {{ somente_vendas_com_nf?: boolean }} patch
 */
async function updateUserSettings(tenantId, userKey, patch) {
    await ensureSettingsTable();
    const normUser = normalizeUserKey(userKey);
    if (!normUser) {
        return updateTenantSettings(tenantId, patch, 'admin');
    }

    const somenteVendasComNf = Boolean(patch.somente_vendas_com_nf);
    const { rows } = await db.query(
        `INSERT INTO dash_configuracoes_usuario (tenant_id, user_key, somente_vendas_com_nf, updated_at)
         VALUES ($1, $2, $3, NOW())
         ON CONFLICT (tenant_id, user_key)
         DO UPDATE SET
            somente_vendas_com_nf = EXCLUDED.somente_vendas_com_nf,
            updated_at = NOW()
         RETURNING somente_vendas_com_nf, updated_at`,
        [tenantId, normUser, somenteVendasComNf]
    );

    const cacheKey = `${tenantId}:${normUser}`;
    const uData = {
        somente_vendas_com_nf: Boolean(rows[0]?.somente_vendas_com_nf),
        updated_at: rows[0]?.updated_at || new Date().toISOString(),
    };
    userSettingsCache.set(cacheKey, {
        data: uData,
        expiresAt: Date.now() + SETTINGS_TTL_MS,
    });

    const { hasSyncedNf, hasChaveNfe } = await checkTenantNfCoverage(tenantId);
    return {
        somente_vendas_com_nf: uData.somente_vendas_com_nf,
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
    checkTenantHasSyncedNf,
    checkTenantNfCoverage,
    invalidateTenantSettingsCache,
};

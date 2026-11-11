'use strict';

const db = require('../db/postgres');
const logger = require('../config/logger');
const { invalidateTenant } = require('../config/cache');

const settingsCache = new Map();
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

module.exports = {
    getTenantSettings,
    updateTenantSettings,
    checkTenantHasSyncedNf,
    checkTenantNfCoverage,
    invalidateTenantSettingsCache,
};

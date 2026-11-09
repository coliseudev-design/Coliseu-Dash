'use strict';

const db = require('../db/postgres');
const logger = require('../config/logger');
const { invalidateTenant } = require('../config/cache');

const settingsCache = new Map();
const SETTINGS_TTL_MS = 60 * 1000;
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
 * Obtém os parâmetros configurados para o tenant (com cache leve em memória de 60s).
 * @param {string} tenantId
 */
async function getTenantSettings(tenantId) {
    const defaultSettings = {
        somente_vendas_com_nf: false,
        updated_at: null,
        updated_by: null,
    };

    if (!tenantId || tenantId === '00000000-0000-0000-0000-000000000000') {
        return defaultSettings;
    }

    const cached = settingsCache.get(tenantId);
    if (cached && cached.expiresAt > Date.now()) {
        return cached.data;
    }

    try {
        await ensureSettingsTable();
        const { rows } = await db.query(
            `SELECT somente_vendas_com_nf, updated_at, updated_by
             FROM dash_configuracoes_tenant
             WHERE tenant_id = $1`,
            [tenantId]
        );

        const data = rows.length > 0
            ? {
                somente_vendas_com_nf: Boolean(rows[0].somente_vendas_com_nf),
                updated_at: rows[0].updated_at || null,
                updated_by: rows[0].updated_by || null,
            }
            : defaultSettings;

        settingsCache.set(tenantId, {
            data,
            expiresAt: Date.now() + SETTINGS_TTL_MS,
        });

        return data;
    } catch (err) {
        logger.warn('[TenantSettings] Falha ao consultar parâmetros do tenant; usando padrão', {
            tenantId,
            error: err.message,
        });
        return defaultSettings;
    }
}

/**
 * Atualiza os parâmetros do tenant e invalida imediatamente os caches de consulta.
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

    const updated = {
        somente_vendas_com_nf: Boolean(rows[0]?.somente_vendas_com_nf),
        updated_at: rows[0]?.updated_at || new Date().toISOString(),
        updated_by: rows[0]?.updated_by || updatedBy,
    };

    settingsCache.set(tenantId, {
        data: updated,
        expiresAt: Date.now() + SETTINGS_TTL_MS,
    });

    invalidateTenant(tenantId);
    return updated;
}

module.exports = {
    getTenantSettings,
    updateTenantSettings,
};

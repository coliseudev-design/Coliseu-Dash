'use strict';

const express = require('express');
const router = express.Router();
const config = require('../config/env');
const logger = require('../config/logger');
const {
    getTenantSettings,
    updateTenantSettings,
    getUserSettings,
    updateUserSettings,
    getAvailableTenantCfops,
} = require('../utils/tenantSettings');
const { getUserPermissions } = require('../utils/rbac');

/**
 * @route GET /api/configuracoes/empresa
 * @desc Retorna dados da empresa logada a partir do Identity Server.
 */
router.get('/empresa', async (req, res) => {
    try {
        const tenantId = req.tenant?.id;
        if (!tenantId) {
            return res.json({ name: 'Coliseu Dash' });
        }

        const { identityApiUrl, identityInternalKey, expectedModuleSlug } = config.security;

        if (!identityApiUrl || !identityInternalKey) {
            return res.json({ name: 'Coliseu Dash' });
        }

        const url = `${identityApiUrl}/internal/companies/${tenantId}/modules/${expectedModuleSlug}/info`;
        
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 3000); // Timeout rápido para não travar a UI

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'X-Internal-Api-Key': identityInternalKey
            },
            signal: controller.signal
        });
        clearTimeout(timeout);

        if (response.status === 200) {
            const data = await response.json();
            // Retorna todo o payload (ex: valid, deviceLimit, nomeDaEmpresa) ou pelo menos a estrutura básica
            return res.json({
                name: data.nomeDaEmpresa || 'Coliseu Dash',
                ...data
            });
        }

        logger.warn('[Configuracoes] Falha ao consultar Identity Server', { status: response.status, tenantId });
        return res.json({ name: 'Coliseu Dash' });

    } catch (err) {
        logger.error('[Configuracoes] Erro na rota de busca da empresa', { err: err.message });
        // Fallback genérico para não quebrar a UI
        return res.json({ name: 'Coliseu Dash' });
    }
});

/**
 * @route GET /api/configuracoes/parametros
 * @desc Retorna os parâmetros configuráveis da empresa no B.I IA.
 */
router.get('/parametros', async (req, res, next) => {
    try {
        const tenantId = req.tenant?.id;
        if (!tenantId) {
            return res.status(401).json({ error: 'Tenant não identificado.' });
        }
        const userKey = req.user?.email || req.user?.id || req.headers['x-user-key'] || null;
        const [settings, cfopsDisponiveis] = await Promise.all([
            getUserSettings(tenantId, userKey, null),
            getAvailableTenantCfops(tenantId),
        ]);
        return res.json({
            ...settings,
            cfops_disponiveis: cfopsDisponiveis,
        });
    } catch (err) {
        next(err);
    }
});

/**
 * @route PUT /api/configuracoes/parametros
 * @desc Atualiza os parâmetros individuais do usuário logado (ex: somente_vendas_com_nf - DEM-0028) e CFOPs que somam no projeto.
 */
router.put('/parametros', async (req, res, next) => {
    try {
        const tenantId = req.tenant?.id;
        if (!tenantId) {
            return res.status(401).json({ error: 'Tenant não identificado.' });
        }

        const userKey = req.user?.email || String(req.user?.id || req.headers['x-user-key'] || 'default');
        const patch = {};
        if (req.body?.somente_vendas_com_nf !== undefined) {
            patch.somente_vendas_com_nf = Boolean(req.body.somente_vendas_com_nf);
        }
        if (req.body?.cfops_faturamento !== undefined) {
            patch.cfops_faturamento = Array.isArray(req.body.cfops_faturamento)
                ? req.body.cfops_faturamento
                : null;
        }

        const [updated, cfopsDisponiveis] = await Promise.all([
            updateUserSettings(tenantId, userKey, patch),
            getAvailableTenantCfops(tenantId),
        ]);

        logger.info('[Configuracoes] Parâmetros atualizados com sucesso', {
            tenantId,
            userKey,
            somente_vendas_com_nf: updated.somente_vendas_com_nf,
            cfops_faturamento: updated.cfops_faturamento,
        });

        return res.json({
            ...updated,
            cfops_disponiveis: cfopsDisponiveis,
        });
    } catch (err) {
        next(err);
    }
});

module.exports = router;

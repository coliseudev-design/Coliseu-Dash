'use strict';

const express = require('express');
const router = express.Router();
const db = require('../db/postgres');
const logger = require('../config/logger');

/**
 * Helper: constrói o fragmento SQL de filtro de departamento.
 * Retorna { clause, params } para injeção segura nas queries.
 *
 * @param {string|number|null} deptoId  - valor de req.query.depto_id
 * @param {number} nextParamIndex       - índice do próximo $N disponível
 * @param {string} alias                - alias da tabela (ex: 'v', 'f', 'c')
 * @returns {{ clause: string, params: any[] }}
 */
function buildDeptoFilter(deptoId, nextParamIndex, alias = 'v') {
    if (!deptoId || deptoId === 'todas' || deptoId === 'all') {
        return { clause: '', params: [] };
    }
    const num = parseInt(deptoId, 10);
    if (isNaN(num)) return { clause: '', params: [] };
    return {
        clause: ` AND ${alias}.depto_id = $${nextParamIndex}`,
        params: [num]
    };
}

// ----------------------------------------------------------------
// GET /api/filiais  →  Lista filiais do tenant
// ----------------------------------------------------------------
router.get('/', async (req, res, next) => {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(401).json({ error: 'Tenant não autenticado.' });

    try {
        const { rows } = await db.query(
            `SELECT id, empresa_erp, depto_id, centro_custo, nome, documento, is_default, ativo
             FROM dash_filiais
             WHERE tenant_id = $1 AND ativo = true
             ORDER BY is_default DESC, nome ASC`,
            [tenantId]
        );
        res.json({ filiais: rows });
    } catch (err) {
        logger.error('[Filiais] Erro ao listar filiais:', err.message);
        next(err);
    }
});

// ----------------------------------------------------------------
// POST /api/sync/dash_filiais  →  Aceito pelo sync.js via Worker
// (Rota de leitura alternativa para o admin do tenant)
// ----------------------------------------------------------------
router.get('/check/:deptoId', async (req, res, next) => {
    const tenantId = req.user?.tenantId;
    const deptoId = parseInt(req.params.deptoId, 10);
    if (!tenantId) return res.status(401).json({ error: 'Tenant não autenticado.' });

    try {
        const { rows } = await db.query(
            `SELECT EXISTS(
                SELECT 1 FROM dash_filiais
                WHERE tenant_id = $1 AND depto_id = $2 AND ativo = true
             ) AS tem_acesso`,
            [tenantId, deptoId]
        );
        res.json({ tem_acesso: rows[0]?.tem_acesso ?? false });
    } catch (err) {
        next(err);
    }
});

module.exports = { router, buildDeptoFilter };

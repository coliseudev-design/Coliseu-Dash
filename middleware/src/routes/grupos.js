'use strict';

const express = require('express');
const router = express.Router();
const db = require('../db/postgres');
const logger = require('../config/logger');

// Apenas administradores do tenant (ou master) podem gerenciar grupos
const requireAdmin = (req, res, next) => {
    if (req.user.role === 'admin' || req.user.role === 'master') {
        return next();
    }
    return res.status(403).json({ error: 'Acesso restrito a administradores', code: 'FORBIDDEN' });
};

/**
 * GET /api/grupos
 * Lista todos os grupos de acesso do tenant e layout_version correspondente.
 */
router.get('/', requireAdmin, async (req, res) => {
    try {
        const tenantId = req.tenant.id;
        const layoutVersion = req.query.layout_version || 'v1.0';

        const { rows } = await db.query(
            `SELECT id, nome, layout_version 
             FROM dash_grupos_acesso 
             WHERE tenant_id = $1 AND layout_version = $2 
             ORDER BY nome ASC`,
            [tenantId, layoutVersion]
        );
        res.json(rows);
    } catch (err) {
        logger.error('[Grupos] Erro ao listar grupos', err);
        res.status(500).json({ error: 'Erro ao listar grupos de acesso' });
    }
});

/**
 * GET /api/grupos/:id/permissions
 * Retorna as permissões de um grupo específico.
 */
router.get('/:id/permissions', requireAdmin, async (req, res) => {
    try {
        const tenantId = req.tenant.id;
        const groupId = req.params.id;

        // Verificar se o grupo pertence ao tenant
        const groupCheck = await db.query(
            'SELECT id FROM dash_grupos_acesso WHERE id = $1 AND tenant_id = $2',
            [groupId, tenantId]
        );

        if (groupCheck.rowCount === 0) {
            return res.status(404).json({ error: 'Grupo não encontrado', code: 'NOT_FOUND' });
        }

        const { rows } = await db.query(
            'SELECT recurso, pode_acessar FROM dash_permissoes WHERE grupo_id = $1',
            [groupId]
        );

        res.json(rows);
    } catch (err) {
        logger.error('[Grupos] Erro ao buscar permissões', err);
        res.status(500).json({ error: 'Erro ao buscar permissões do grupo' });
    }
});

/**
 * POST /api/grupos
 * Cria um novo grupo para o tenant/layout.
 */
router.post('/', requireAdmin, async (req, res) => {
    try {
        const tenantId = req.tenant.id;
        const { nome, layout_version, permissions } = req.body;

        if (!nome || !layout_version) {
            return res.status(400).json({ error: 'Nome e layout_version são obrigatórios' });
        }

        // Criar o grupo
        const groupRes = await db.query(
            `INSERT INTO dash_grupos_acesso (tenant_id, layout_version, nome)
             VALUES ($1, $2, $3)
             RETURNING id, nome, layout_version`,
            [tenantId, layout_version, nome]
        );

        const groupId = groupRes.rows[0].id;

        // Se passadas permissões, insere
        if (Array.isArray(permissions)) {
            for (const recurso of permissions) {
                await db.query(
                    `INSERT INTO dash_permissoes (grupo_id, recurso, pode_acessar)
                     VALUES ($1, $2, true)
                     ON CONFLICT (grupo_id, recurso) DO UPDATE SET pode_acessar = true`,
                    [groupId, recurso]
                );
            }
        }

        res.status(201).json(groupRes.rows[0]);
    } catch (err) {
        logger.error('[Grupos] Erro ao criar grupo', err);
        if (err.code === '23505') {
            return res.status(409).json({ error: 'Já existe um grupo com este nome para este layout.' });
        }
        res.status(500).json({ error: 'Erro ao criar grupo de acesso' });
    }
});

/**
 * PUT /api/grupos/:id/permissions
 * Atualiza todas as permissões de um grupo.
 */
router.put('/:id/permissions', requireAdmin, async (req, res) => {
    try {
        const tenantId = req.tenant.id;
        const groupId = req.params.id;
        const { permissions } = req.body; // Array de strings com recursos permitidos

        if (!Array.isArray(permissions)) {
            return res.status(400).json({ error: 'Permissions deve ser um array de strings contendo os recursos autorizados.' });
        }

        // Verificar se o grupo pertence ao tenant
        const groupCheck = await db.query(
            'SELECT id FROM dash_grupos_acesso WHERE id = $1 AND tenant_id = $2',
            [groupId, tenantId]
        );

        if (groupCheck.rowCount === 0) {
            return res.status(404).json({ error: 'Grupo não encontrado', code: 'NOT_FOUND' });
        }

        // Limpar permissões anteriores e inserir as novas
        await db.query('DELETE FROM dash_permissoes WHERE grupo_id = $1', [groupId]);

        for (const recurso of permissions) {
            await db.query(
                `INSERT INTO dash_permissoes (grupo_id, recurso, pode_acessar)
                 VALUES ($1, $2, true)`,
                [groupId, recurso]
            );
        }

        res.json({ message: 'Permissões atualizadas com sucesso' });
    } catch (err) {
        logger.error('[Grupos] Erro ao atualizar permissões', err);
        res.status(500).json({ error: 'Erro ao atualizar permissões do grupo' });
    }
});

/**
 * DELETE /api/grupos/:id
 * Remove um grupo.
 */
router.delete('/:id', requireAdmin, async (req, res) => {
    try {
        const tenantId = req.tenant.id;
        const groupId = req.params.id;

        // Verificar se o grupo pertence ao tenant
        const groupCheck = await db.query(
            'SELECT id FROM dash_grupos_acesso WHERE id = $1 AND tenant_id = $2',
            [groupId, tenantId]
        );

        if (groupCheck.rowCount === 0) {
            return res.status(404).json({ error: 'Grupo não encontrado', code: 'NOT_FOUND' });
        }

        await db.query('DELETE FROM dash_grupos_acesso WHERE id = $1', [groupId]);

        res.json({ message: 'Grupo removido com sucesso' });
    } catch (err) {
        logger.error('[Grupos] Erro ao remover grupo', err);
        res.status(500).json({ error: 'Erro ao remover grupo de acesso' });
    }
});

module.exports = router;

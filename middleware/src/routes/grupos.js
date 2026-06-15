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
 * Lista todos os grupos de acesso do tenant e versao correspondente.
 */
router.get('/', requireAdmin, async (req, res) => {
    try {
        const tenantId = req.tenant.id;
        const layoutVersion = req.query.versao || req.query.layout_version;

        let query = `SELECT id, nome, versao 
                     FROM dash_grupos_acesso 
                     WHERE tenant_id = $1`;
        let params = [tenantId];

        if (layoutVersion && layoutVersion !== 'all') {
            query += ` AND versao = $2`;
            params.push(layoutVersion);
        } else if (!layoutVersion) {
            query += ` AND versao = $2`;
            params.push('Dash 1.0');
        }

        query += ` ORDER BY nome ASC`;

        const { rows } = await db.query(query, params);
        res.json(rows.map(r => ({
            id: r.id,
            nome: r.nome,
            versao: r.versao,
            layout_version: r.versao
        })));
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
 * Cria um novo grupo para o tenant/versao.
 */
router.post('/', requireAdmin, async (req, res) => {
    try {
        const tenantId = req.tenant.id;
        const { nome, versao, layout_version, permissions } = req.body;
        const targetVersion = versao || layout_version;

        if (!nome || !targetVersion) {
            return res.status(400).json({ error: 'Nome e versao são obrigatórios' });
        }

        // Criar o grupo
        const groupRes = await db.query(
            `INSERT INTO dash_grupos_acesso (tenant_id, versao, nome)
             VALUES ($1, $2, $3)
             RETURNING id, nome, versao`,
            [tenantId, targetVersion, nome]
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

        res.status(201).json({
            id: groupRes.rows[0].id,
            nome: groupRes.rows[0].nome,
            versao: groupRes.rows[0].versao,
            layout_version: groupRes.rows[0].versao
        });
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

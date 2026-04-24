'use strict';

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../db/postgres');
const config = require('../config/env');
const logger = require('../config/logger');

/**
 * GET /api/usuarios
 * Lista usuários. Se for Master, lista todos. Se for Tenant normal, lista apenas os do Tenant.
 */
router.get('/', async (req, res) => {
    try {
        let query = `SELECT id, tenant_id, email, nome, role, ativo, created_at FROM dash_usuarios`;
        let params = [];
        
        if (req.user.tenant !== '00000000-0000-0000-0000-000000000000') {
            query += ` WHERE tenant_id = $1`;
            params.push(req.user.tenant);
        }
        
        query += ` ORDER BY created_at DESC`;
        
        const result = await db.query(query, params);
        res.json(result.rows);
    } catch (err) {
        logger.error('[Usuarios] Erro ao listar', err);
        res.status(500).json({ error: 'Erro ao listar usuários' });
    }
});

/**
 * POST /api/usuarios
 * Cadastro de novo usuário por dentro do painel.
 */
router.post('/', async (req, res) => {
    try {
        const { nome, email, password, companyKey } = req.body;

        if (!nome || !email || !password || !companyKey) {
            return res.status(400).json({ error: 'Nome, email, senha e CompanyKey são obrigatórios' });
        }

        // Segurança: Se não for master, só pode criar usuário para a própria empresa
        if (req.user.tenant !== '00000000-0000-0000-0000-000000000000' && companyKey !== req.user.tenant) {
            return res.status(403).json({ error: 'Você só pode criar usuários para a sua própria empresa.' });
        }

        // Validação no Servidor de Licenças (Limite de Dispositivos/Cadastros)
        const { identityApiUrl, identityInternalKey, expectedModuleSlug } = config.security;

        if (!identityApiUrl || !identityInternalKey) {
            return res.status(500).json({ error: 'Erro de infraestrutura do sistema de licenças' });
        }

        try {
            const url = `${identityApiUrl}/internal/companies/${companyKey}/modules/${expectedModuleSlug}/info`;
            
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 3000);

            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Internal-Api-Key': identityInternalKey
                },
                signal: controller.signal
            });
            clearTimeout(timeout);

            if (response.status !== 200) {
                const data = await response.json().catch(() => ({}));
                const reason = data.reason || data.error || 'Empresa inativa ou módulo bloqueado.';
                return res.status(403).json({ error: reason });
            }

            const data = await response.json();
            const deviceLimit = data.deviceLimit || 0;

            const countQuery = `SELECT COUNT(*) as total FROM dash_usuarios WHERE tenant_id = $1`;
            const countResult = await db.query(countQuery, [companyKey]);
            const currentUsersCount = parseInt(countResult.rows[0].total, 10);

            if (currentUsersCount >= deviceLimit) {
                return res.status(403).json({ 
                    error: `O limite de licenças (${deviceLimit}) para esta empresa foi atingido. Nenhuma nova conta pode ser criada.`
                });
            }
        } catch (err) {
            logger.error('[Usuarios] Erro ao comunicar com licenças', err);
            return res.status(503).json({ error: 'Servidor de licenças indisponível.' });
        }

        // Valida se o email já existe
        const checkQuery = `SELECT id FROM dash_usuarios WHERE email = $1`;
        const checkResult = await db.query(checkQuery, [email]);
        
        if (checkResult.rowCount > 0) {
            return res.status(409).json({ error: 'Este email já está em uso' });
        }

        // Hash da senha
        const salt = await bcrypt.genSalt(10);
        const senhaHash = await bcrypt.hash(password, salt);

        // Insere o usuário
        const insertQuery = `
            INSERT INTO dash_usuarios (tenant_id, email, nome, role, ativo, senha_hash)
            VALUES ($1, $2, $3, 'viewer', true, $4)
            RETURNING id, tenant_id, email, nome, role, ativo, created_at
        `;
        const result = await db.query(insertQuery, [companyKey, email, nome, senhaHash]);
        const user = result.rows[0];

        logger.info('[Usuarios] Novo usuário criado via painel', { email: user.email, by: req.user.email });

        res.status(201).json(user);
    } catch (err) {
        logger.error('[Usuarios] Erro ao criar', err);
        if (err.code === '22P02') {
            return res.status(400).json({ error: 'CompanyKey inválida (deve ser um UUID).' });
        }
        res.status(500).json({ error: 'Erro interno ao criar usuário' });
    }
});

/**
 * PUT /api/usuarios/:id/status
 * Ativa ou Inativa um usuário
 */
router.put('/:id/status', async (req, res) => {
    try {
        const { ativo } = req.body;
        const targetId = req.params.id;

        if (typeof ativo !== 'boolean') {
            return res.status(400).json({ error: 'O campo "ativo" deve ser booleano (true/false).' });
        }

        // Não deixa a pessoa se desativar sozinha (segurança)
        if (targetId === req.user.sub && !ativo) {
            return res.status(400).json({ error: 'Você não pode inativar seu próprio usuário.' });
        }

        let query = `UPDATE dash_usuarios SET ativo = $1 WHERE id = $2`;
        let params = [ativo, targetId];

        if (req.user.tenant !== '00000000-0000-0000-0000-000000000000') {
            query += ` AND tenant_id = $3`;
            params.push(req.user.tenant);
        }

        query += ` RETURNING id, ativo`;

        const result = await db.query(query, params);

        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Usuário não encontrado ou você não tem permissão para editá-lo.' });
        }

        logger.info('[Usuarios] Status alterado', { targetId, ativo, by: req.user.email });

        res.json({ message: 'Status atualizado com sucesso', user: result.rows[0] });
    } catch (err) {
        logger.error('[Usuarios] Erro ao alterar status', err);
        res.status(500).json({ error: 'Erro ao alterar status do usuário' });
    }
});

module.exports = router;

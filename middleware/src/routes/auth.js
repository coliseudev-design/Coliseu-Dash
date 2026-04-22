'use strict';

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db/postgres');
const config = require('../config/env');
const logger = require('../config/logger');

/**
 * Login interno do Dashboard.
 */
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email e senha são obrigatórios', code: 'MISSING_CREDENTIALS' });
        }

        // Buscar usuário localmente
        const query = `SELECT id, tenant_id, email, nome, role, ativo, senha_hash FROM dash_usuarios WHERE email = $1`;
        const result = await db.query(query, [email]);

        if (result.rowCount === 0) {
            return res.status(401).json({ error: 'Usuário não encontrado', code: 'INVALID_LOGIN' });
        }

        const user = result.rows[0];

        if (!user.ativo) {
            return res.status(403).json({ error: 'Usuário inativo', code: 'USER_INACTIVE' });
        }

        // Validar senha
        const isMatch = await bcrypt.compare(password, user.senha_hash);
        if (!isMatch) {
            return res.status(401).json({ error: 'Senha incorreta', code: 'INVALID_LOGIN' });
        }

        // TODO: Futuramente chamar o Identity Server aqui para checar limite de licenças simultâneas do tenant

        // Gerar JWT
        const token = jwt.sign(
            {
                sub: user.id,
                email: user.email,
                tenant: user.tenant_id,
                tenantId: user.tenant_id,
                module: 'dashboard',
                companyName: user.tenant_id === '00000000-0000-0000-0000-000000000000' ? 'Coliseu Sistemas (Master)' : 'Empresa Cliente',
                role: user.role
            },
            config.security.jwtDeviceKey,
            { expiresIn: '12h' }
        );

        logger.info('[Auth] Login interno bem-sucedido', { email: user.email, tenant: user.tenant_id });

        res.status(200).json({
            token,
            user: {
                id: user.id,
                email: user.email,
                nome: user.nome,
                role: user.role,
                tenant_id: user.tenant_id
            }
        });

    } catch (err) {
        logger.error('[Auth] Erro na rota de login', err);
        res.status(500).json({ error: 'Erro interno no servidor', code: 'INTERNAL_ERROR' });
    }
});

module.exports = router;

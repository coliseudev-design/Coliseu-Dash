'use strict';

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db/postgres');
const config = require('../config/env');
const logger = require('../config/logger');
const { getUserPermissions } = require('../utils/rbac');
const { requireWebJwt } = require('../middleware/auth');

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
        const query = `SELECT id, tenant_id, email, nome, role, ativo, senha_hash, permissions, versao FROM dash_usuarios WHERE LOWER(TRIM(email)) = LOWER(TRIM($1))`;
        const result = await db.query(query, [email]);

        if (result.rowCount === 0) {
            return res.status(401).json({ error: 'Usuário não encontrado', code: 'INVALID_LOGIN' });
        }

        const user = result.rows[0];

        if (!user.ativo) {
            return res.status(403).json({ error: 'Usuário inativo', code: 'USER_INACTIVE' });
        }

        // Validar senha (REMOVIDO A PEDIDO DO USUÁRIO)
        // const isMatch = await bcrypt.compare(password, user.senha_hash);
        // if (!isMatch) {
        //     return res.status(401).json({ error: 'Senha incorreta', code: 'INVALID_LOGIN' });
        // }

        // TODO: Futuramente chamar o Identity Server aqui para checar limite de licenças simultâneas do tenant

        // Gerar JWT
        const token = jwt.sign(
            {
                sub: user.id,
                email: user.email,
                tenant: user.tenant_id,
                tenantId: user.tenant_id,
                module: config.security.expectedModuleSlug,
                companyName: user.tenant_id === '00000000-0000-0000-0000-000000000000' ? 'Coliseu Sistemas (Master)' : 'Empresa Cliente',
                role: user.role,
                layoutVersion: user.versao
            },
            config.security.jwtDeviceKey,
            { expiresIn: '12h' }
        );

        logger.info('[Auth] Login interno bem-sucedido', { email: user.email, tenant: user.tenant_id });

        const permissions = await getUserPermissions(user.id, user.tenant_id);

        res.status(200).json({
            token,
            user: {
                id: user.id,
                email: user.email,
                nome: user.nome,
                role: user.role,
                tenant_id: user.tenant_id,
                permissions,
                versao: user.versao,
                layout_version: user.versao
            }
        });

    } catch (err) {
        logger.error('[Auth] Erro na rota de login', err);
        res.status(500).json({ error: 'Erro interno no servidor', code: 'INTERNAL_ERROR' });
    }
});

/**
 * Logout do usuário.
 */
router.post('/logout', async (req, res) => {
    // Como usamos JWT, o frontend já remove o token.
    // Aqui podemos apenas retornar sucesso ou invalidar sessão no futuro.
    res.status(200).json({ message: 'Logout realizado com sucesso' });
});

/**
 * Cadastro de novo usuário.
 */
router.post('/register', async (req, res) => {
    try {
        const { nome, email, password, companyKey } = req.body;

        if (!nome || !email || !password || !companyKey) {
            return res.status(400).json({ error: 'Nome, email, senha e ID da Empresa (CompanyKey) são obrigatórios', code: 'MISSING_FIELDS' });
        }

        // 1. Validação no Servidor de Licenças (Limite de Dispositivos/Cadastros)
        const { identityApiUrl, identityInternalKey, expectedModuleSlug } = config.security;

        if (!identityApiUrl || !identityInternalKey) {
            logger.warn('[Auth] Falta configuração do IDENTITY_API_URL/KEY. Bloqueando cadastro por segurança.');
            return res.status(500).json({ error: 'Erro de infraestrutura do sistema de licenças', code: 'CONFIG_ERROR' });
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
                return res.status(403).json({ error: reason, code: 'MODULE_BLOCKED' });
            }

            const data = await response.json();
            const deviceLimit = data.deviceLimit || 0;

            // Checar a quantidade atual de usuários para este tenant
            const countQuery = `SELECT COUNT(*) as total FROM dash_usuarios WHERE tenant_id = $1`;
            const countResult = await db.query(countQuery, [companyKey]);
            const currentUsersCount = parseInt(countResult.rows[0].total, 10);

            if (currentUsersCount >= deviceLimit) {
                return res.status(403).json({ 
                    error: `O limite de licenças (${deviceLimit}) para esta empresa foi atingido. Nenhuma nova conta pode ser criada.`, 
                    code: 'LICENSE_LIMIT_REACHED' 
                });
            }
        } catch (err) {
            logger.error('[Auth] Erro ao comunicar com o servidor de licenças durante cadastro', err);
            return res.status(503).json({ error: 'Servidor de licenças temporariamente indisponível. Não foi possível validar sua licença.', code: 'LICENSE_API_ERROR' });
        }

        // 2. Valida se o email já existe
        const checkQuery = `SELECT id FROM dash_usuarios WHERE LOWER(TRIM(email)) = LOWER(TRIM($1))`;
        const checkResult = await db.query(checkQuery, [email]);
        
        if (checkResult.rowCount > 0) {
            return res.status(409).json({ error: 'Este email já está em uso', code: 'EMAIL_IN_USE' });
        }

        // Hash da senha
        const salt = await bcrypt.genSalt(10);
        const senhaHash = await bcrypt.hash(password, salt);

        // Insere o usuário (default role: admin)
        const insertQuery = `
            INSERT INTO dash_usuarios (tenant_id, email, nome, role, ativo, senha_hash, permissions, versao)
            VALUES ($1, $2, $3, 'admin', true, $4, NULL, 'Dash 1.0')
            RETURNING id, tenant_id, email, nome, role, permissions, versao
        `;
        const result = await db.query(insertQuery, [companyKey, email, nome, senhaHash]);
        const user = result.rows[0];

        logger.info('[Auth] Novo usuário cadastrado', { email: user.email, tenant: user.tenant_id });

        // Retorna sucesso. O front pode fazer auto-login depois.
        res.status(201).json({
            message: 'Usuário cadastrado com sucesso',
            user: {
                id: user.id,
                tenant_id: user.tenant_id,
                email: user.email,
                nome: user.nome,
                role: user.role,
                permissions: user.permissions,
                versao: user.versao,
                layout_version: user.versao
            }
        });
    } catch (err) {
        logger.error('[Auth] Erro na rota de cadastro', err);
        // Tratar erro de UUID mal formatado (caso o usuário digite texto comum em vez de CompanyKey válida)
        if (err.code === '22P02') {
            return res.status(400).json({ error: 'ID da Empresa inválido. O CompanyKey deve ser um UUID válido.', code: 'INVALID_UUID' });
        }
        res.status(500).json({ error: 'Erro interno no servidor ao cadastrar', code: 'INTERNAL_ERROR' });
    }
});

/**
 * GET /api/auth/me
 * Retorna o perfil do usuário logado com as permissões ativas.
 */
router.get('/me', requireWebJwt, async (req, res) => {
    try {
        const userId = req.user.id;
        const tenantId = req.tenant.id;

        const { rows } = await db.query(
            'SELECT id, tenant_id, email, nome, role, versao, grupo_id FROM dash_usuarios WHERE id = $1 AND tenant_id = $2',
            [userId, tenantId]
        );

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Usuário não encontrado', code: 'USER_NOT_FOUND' });
        }

        const user = rows[0];
        const permissions = await getUserPermissions(user.id, user.tenant_id);

        res.json({
            user: {
                id: user.id,
                email: user.email,
                nome: user.nome,
                role: user.role,
                tenant_id: user.tenant_id,
                permissions,
                versao: user.versao,
                layout_version: user.versao,
                grupo_id: user.grupo_id
            }
        });
    } catch (err) {
        logger.error('[Auth] Erro no endpoint /me', err);
        res.status(500).json({ error: 'Erro interno no servidor', code: 'INTERNAL_ERROR' });
    }
});

module.exports = router;

'use strict';

const jwt = require('jsonwebtoken');
const config = require('../config/env');
const logger = require('../config/logger');

/**
 * Middleware para validar JWT do Web (Gerente App Dashboard).
 * 
 * 1. Extrai header Authorization: Bearer <token>
 * 2. Valida assinatura HMAC usando JWT_DEVICE_KEY
 * 3. Valida se o claim module == 'dashboard' 
 * 4. Injeta req.tenant
 *
 * @param {import('express').Request}  req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
async function requireWebJwt(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        logger.warn('[Auth] Requisição sem token JWT (Bearer)', { ip: req.ip, path: req.path });
        return res.status(401).json({ error: 'Não autorizado', code: 'MISSING_JWT' });
    }

    const token = authHeader.substring(7);

    try {
        const secret = config.security.jwtDeviceKey;
        const decoded = jwt.verify(token, secret);

        const tenantId = decoded.tenantId || decoded.tenant;
        const moduleSlug = decoded.module;

        if (!tenantId) {
            logger.warn('[Auth] JWT inválido: sem claim tenant', { ip: req.ip, path: req.path });
            return res.status(401).json({ error: 'Token inválido', code: 'INVALID_TOKEN_CLAIMS' });
        }

        if (moduleSlug !== config.security.expectedModuleSlug) {
            logger.warn('[Auth] Módulo não autorizado para este token', { 
                ip: req.ip, 
                path: req.path, 
                tokenModule: moduleSlug, 
                expected: config.security.expectedModuleSlug 
            });
            return res.status(403).json({ error: 'Módulo de acesso incorreto', code: 'INVALID_MODULE' });
        }

        req.tenant = { id: tenantId, name: decoded.companyName || 'Unknown' };
        req.user = { id: decoded.userId || decoded.sub };

        next();
    } catch (err) {
        if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
            logger.warn('[Auth] JWT inválido ou expirado', { ip: req.ip, path: req.path, error: err.message });
            return res.status(401).json({ error: 'Sessão expirada. Faça login novamente.', code: 'INVALID_JWT' });
        }

        logger.error('[Auth] Erro interno ao validar token', { error: err.message });
        return res.status(500).json({ error: 'Erro interno no servidor', code: 'INTERNAL_ERROR' });
    }
}

/**
 * Middleware para autenticar rotas internas usadas pelo Worker (.NET).
 * 
 * Valida o header X-Internal-Key contra a chave configurada no servidor.
 * Extrai o tenantId do header X-Tenant-Id (enviado pelo Worker).
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
async function requireInternalAuth(req, res, next) {
    const internalKey = req.headers['x-internal-key'];
    const tenantId    = req.headers['x-tenant-id'];

    const expectedKey = config.security.internalApiKey;
    if (!expectedKey || internalKey !== expectedKey) {
        logger.warn('[InternalAuth] Chave interna inválida ou ausente', { ip: req.ip, path: req.path });
        return res.status(401).json({ error: 'Não autorizado', code: 'INVALID_INTERNAL_KEY' });
    }

    if (!tenantId) {
        logger.warn('[InternalAuth] Header X-Tenant-Id ausente', { ip: req.ip, path: req.path });
        return res.status(400).json({ error: 'X-Tenant-Id é obrigatório para rotas internas.', code: 'MISSING_TENANT' });
    }

    req.tenant = { id: tenantId };
    req.device = { id: 'worker' };

    next();
}

module.exports = {
    requireWebJwt,
    requireInternalAuth
};

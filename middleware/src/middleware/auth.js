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
const axios = require('axios');

// Cache em memória (TenantId -> { valid: boolean, expiresAt: number })
// Usado para evitar sobrecarregar o servidor de licenças nas chamadas frequentes do Worker.
const validationCache = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos

/**
 * Middleware para autenticar rotas internas usadas pelo Worker (.NET).
 * 
 * Valida o header X-Internal-Key de forma dinâmica contra a API de Identidade.
 * Se a API estiver offline ou variáveis faltarem, faz fallback para INTERNAL_API_KEY.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
async function requireInternalAuth(req, res, next) {
    const internalKey = req.headers['x-internal-key'];
    const tenantId    = req.headers['x-tenant-id'];

    if (!tenantId) {
        logger.warn('[InternalAuth] Header X-Tenant-Id ausente', { ip: req.ip, path: req.path });
        return res.status(400).json({ error: 'X-Tenant-Id é obrigatório para rotas internas.', code: 'MISSING_TENANT' });
    }

    if (!internalKey) {
        logger.warn('[InternalAuth] Chave interna ausente', { ip: req.ip, path: req.path });
        return res.status(401).json({ error: 'Não autorizado', code: 'INVALID_INTERNAL_KEY' });
    }

    const { identityApiUrl, identityInternalKey, expectedModuleSlug, internalApiKey } = config.security;

    // Se as chaves do Identity não estiverem configuradas, usa o fallback.
    if (!identityApiUrl || !identityInternalKey) {
        if (!internalApiKey || internalKey !== internalApiKey) {
            logger.warn('[InternalAuth] Fallback estático falhou', { ip: req.ip, tenantId });
            return res.status(401).json({ error: 'Não autorizado', code: 'INVALID_INTERNAL_KEY' });
        }
        req.tenant = { id: tenantId };
        req.device = { id: 'worker' };
        return next();
    }

    const cacheKey = `${tenantId}:${internalKey}`;
    const cached = validationCache.get(cacheKey);

    if (cached && cached.expiresAt > Date.now()) {
        if (!cached.valid) {
            logger.warn('[InternalAuth] Bloqueio pelo cache dinâmico', { ip: req.ip, tenantId, reason: cached.reason });
            return res.status(403).json({ error: cached.reason || 'Módulo bloqueado ou chave inválida', code: 'MODULE_BLOCKED' });
        }
        req.tenant = { id: tenantId };
        req.device = { id: 'worker' };
        return next();
    }

    try {
        const response = await axios.post(
            `${identityApiUrl}/internal/companies/${tenantId}/modules/${expectedModuleSlug}/validate-key`,
            { apiKey: internalKey },
            { 
                headers: { 'X-Internal-Api-Key': identityInternalKey },
                timeout: 3000
            }
        );

        if (response.status === 200 && response.data.valid) {
            validationCache.set(cacheKey, { valid: true, expiresAt: Date.now() + CACHE_TTL_MS });
            req.tenant = { id: tenantId };
            req.device = { id: 'worker' };
            return next();
        } else {
            const reason = response.data.reason || 'Sincronização não autorizada pelo Servidor de Identidade.';
            validationCache.set(cacheKey, { valid: false, reason, expiresAt: Date.now() + CACHE_TTL_MS });
            return res.status(403).json({ error: reason, code: 'MODULE_BLOCKED' });
        }
    } catch (err) {
        if (err.response && err.response.status === 403) {
            const reason = err.response.data?.reason || 'Módulo bloqueado (HTTP 403).';
            validationCache.set(cacheKey, { valid: false, reason, expiresAt: Date.now() + CACHE_TTL_MS });
            logger.warn('[InternalAuth] Identity rejeitou o módulo', { tenantId, reason });
            return res.status(403).json({ error: reason, code: 'MODULE_BLOCKED' });
        }

        logger.error('[InternalAuth] Erro ao validar no Identity API. Usando fallback temporário.', { err: err.message, tenantId });
        
        // Timeout ou queda do Identity: usar fallback estático do .env por precaução
        if (internalApiKey && internalKey === internalApiKey) {
            req.tenant = { id: tenantId };
            req.device = { id: 'worker' };
            return next();
        }

        return res.status(401).json({ error: 'Falha na comunicação com controle de licenças', code: 'IDENTITY_API_ERROR' });
    }
}

module.exports = {
    requireWebJwt,
    requireInternalAuth
};

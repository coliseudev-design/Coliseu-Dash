'use strict';

const rateLimit = require('express-rate-limit');
const config = require('../config/env');

const defaultLimit = rateLimit({
    windowMs: config.security.rateLimitWindowMs,
    max: config.security.rateLimitMax,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Muitas requisições. Tente novamente em instantes.', code: 'RATE_LIMITED' },
    keyGenerator: (req) => {
        // Limita por tenant (ou por IP real se não autenticado)
        return req.tenant?.id || req.ip;
    }
});

const authLimit = rateLimit({
    windowMs: 60 * 1000,
    max: 40,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Muitas tentativas de autenticação. Aguarde um minuto e tente novamente.', code: 'AUTH_RATE_LIMITED' },
    keyGenerator: (req) => req.ip
});

module.exports = {
    defaultLimit,
    authLimit
};

'use strict';

require('dotenv').config();

function required(key) {
    const val = process.env[key];
    if (!val) throw new Error(`[Config] Variável de ambiente obrigatória ausente: ${key}`);
    return val;
}

function optional(key, defaultValue = '') {
    const val = process.env[key];
    if (val === undefined || val === null || val === '' || val === 'undefined' || val === 'null') {
        return defaultValue;
    }
    return val;
}

const FORBIDDEN_PROJECT_TOKENS = ['vet', 'vision', 'brascampo', 'siscom', 'nexus', 'sacdigital', 'autocenter'];

function assertColiseuDashIsolation(pgDatabase, moduleSlug) {
    const dbLower = String(pgDatabase || '').trim().toLowerCase();
    const slugLower = String(moduleSlug || '').trim().toLowerCase();

    for (const token of FORBIDDEN_PROJECT_TOKENS) {
        if (dbLower.includes(token)) {
            throw new Error(
                `[SECURITY GUARD] Bloqueio crítico de isolamento: PG_DATABASE ("${pgDatabase}") pertence a outro sistema ("${token}"). O Coliseu Dash aceita exclusivamente "coliseu_dashboard".`
            );
        }
        if (slugLower.includes(token)) {
            throw new Error(
                `[SECURITY GUARD] Bloqueio crítico de isolamento: EXPECTED_MODULE_SLUG ("${moduleSlug}") pertence a outro sistema ("${token}"). O Coliseu Dash aceita exclusivamente "coliseu-dash".`
            );
        }
    }

    if (!dbLower.startsWith('coliseu_dashboard')) {
        throw new Error(
            `[SECURITY GUARD] PG_DATABASE inválido ("${pgDatabase}"). O Coliseu Dash só pode conectar à base "coliseu_dashboard".`
        );
    }

    if (slugLower !== 'coliseu-dash') {
        throw new Error(
            `[SECURITY GUARD] EXPECTED_MODULE_SLUG inválido ("${moduleSlug}"). Deve ser estritamente "coliseu-dash".`
        );
    }
}

const resolvedDatabase = optional('PG_DATABASE', 'coliseu_dashboard');
const resolvedModuleSlug = optional('EXPECTED_MODULE_SLUG', 'coliseu-dash');
assertColiseuDashIsolation(resolvedDatabase, resolvedModuleSlug);

const config = {
    app: {
        id: 'coliseu-dash',
        domain: 'dashboard.coliseusistemas.com.br',
    },

    server: {
        port: parseInt(optional('PORT', '3200'), 10),
        nodeEnv: optional('NODE_ENV', 'development'),
        isProduction: optional('NODE_ENV', 'development') === 'production',
    },

    security: {
        jwtDeviceKey: optional('JWT_DEVICE_KEY', 'aQbY3eqVz2xd8PSr0AUKtfwFRo7n1IickE6sMGWTNCpXhZ95'),
        expectedModuleSlug: resolvedModuleSlug,
        internalApiKey: optional('INTERNAL_API_KEY', 'Coliseu2026!IdentitySuperSecretKeyOauth20'),
        identityApiUrl: optional('IDENTITY_API_URL', 'https://adminlicencas.coliseusistemas.com.br'),
        identityInternalKey: (() => {
            const envKey = optional('IDENTITY_INTERNAL_KEY', '');
            if (envKey && envKey !== optional('JWT_DEVICE_KEY', 'aQbY3eqVz2xd8PSr0AUKtfwFRo7n1IickE6sMGWTNCpXhZ95')) {
                return envKey;
            }
            return 'Coliseu2026!IdentitySuperSecretKeyOauth20';
        })(),
        allowedOrigins: optional('ALLOWED_ORIGINS', '')
            .split(',')
            .map(s => s.trim())
            .filter(Boolean),
        rateLimitWindowMs: parseInt(optional('RATE_LIMIT_WINDOW_MS', '60000'), 10),
        rateLimitMax: parseInt(optional('RATE_LIMIT_MAX', '1000'), 10),
    },

    postgres: {
        host: optional('PG_HOST', 'localhost'),
        port: parseInt(optional('PG_PORT', '5432'), 10),
        database: resolvedDatabase,
        user: optional('PG_USER', 'postgres'),
        password: optional('PG_PASSWORD', ''),
        ssl: optional('PG_SSL', 'false') === 'true',
    },
};

module.exports = config;

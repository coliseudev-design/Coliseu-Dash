'use strict';

const { Pool } = require('pg');
const { AsyncLocalStorage } = require('async_hooks');
const config = require('../config/env');
const logger = require('../config/logger');

// AsyncLocalStorage to maintain the active database context for requests/syncs
const dbContext = new AsyncLocalStorage();

// PostgreSQL Pool exclusivo do Coliseu Dash (coliseu_dashboard)
const pool = new Pool({
    host: config.postgres.host,
    port: config.postgres.port,
    database: config.postgres.database,
    user: config.postgres.user,
    password: config.postgres.password,
    ssl: config.postgres.ssl ? { rejectUnauthorized: false } : false,
    application_name: 'coliseu-dash-middleware',
    max: 40,
    min: 2,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
    statement_timeout: 45000,
    options: '-c max_parallel_workers_per_gather=0',
    keepAlive: true,
    keepAliveInitialDelayMillis: 10000,
});

let bootstrapDone = false;

pool.on('error', (err) => {
    logger.error('[DB] Erro inesperado em cliente ocioso do PostgreSQL', { error: err.message });
});

/**
 * Executa uma query no PostgreSQL.
 * @param {string} text - Query SQL
 * @param {any[]} params - Parâmetros
 * @returns {Promise<import('pg').QueryResult<any>>}
 */
async function query(text, params) {
    try {
        const res = await pool.query(text, params);
        return res;
    } catch (err) {
        logger.error('[DB] Falha ao executar query', { text: text.substring(0, 150), error: err.message });
        throw err;
    }
}

/**
 * Checagem ultraleve de conectividade (para /health/readiness sem disparar DDLs ou locks).
 */
async function pingConnection() {
    try {
        await pool.query('SELECT 1 AS ok');
        return true;
    } catch (err) {
        logger.error('[DB] Ping ao PostgreSQL falhou', { error: err.message });
        return false;
    }
}

/**
 * Usado na inicialização do servidor para validar conexão e garantir colunas base (executado apenas 1 vez).
 */
async function checkConnection() {
    const mainOk = await pingConnection();
    if (!mainOk) {
        return false;
    }

    if (bootstrapDone) {
        return true;
    }

    logger.info(`[DB] Conectado ao PostgreSQL (${config.postgres.database})`);

    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS dash_caixas (
                id SERIAL PRIMARY KEY,
                tenant_id UUID NOT NULL,
                id_firebird INTEGER NOT NULL,
                descricao TEXT,
                sincronizado_em TIMESTAMPTZ DEFAULT NOW(),
                UNIQUE(tenant_id, id_firebird)
            );
            CREATE TABLE IF NOT EXISTS dash_marcas (
                id SERIAL PRIMARY KEY,
                tenant_id UUID NOT NULL,
                id_firebird INTEGER NOT NULL,
                nome VARCHAR(255) NOT NULL,
                sincronizado_em TIMESTAMPTZ DEFAULT NOW(),
                UNIQUE(tenant_id, id_firebird)
            );
            CREATE TABLE IF NOT EXISTS dash_grupos (
                id SERIAL PRIMARY KEY,
                tenant_id UUID NOT NULL,
                id_firebird INTEGER NOT NULL,
                nome VARCHAR(255) NOT NULL,
                sincronizado_em TIMESTAMPTZ DEFAULT NOW(),
                UNIQUE(tenant_id, id_firebird)
            );
        `);

        await pool.query(`
            ALTER TABLE dash_vendas ADD COLUMN IF NOT EXISTS especie VARCHAR(100);
            ALTER TABLE dash_vendas ADD COLUMN IF NOT EXISTS depto_id INTEGER;
            ALTER TABLE dash_vendas ADD COLUMN IF NOT EXISTS cfop INTEGER DEFAULT NULL;
            ALTER TABLE dash_vendas ADD COLUMN IF NOT EXISTS numero_nota INTEGER DEFAULT NULL;
            ALTER TABLE dash_vendas ADD COLUMN IF NOT EXISTS es INTEGER DEFAULT NULL;
            ALTER TABLE dash_vendas ADD COLUMN IF NOT EXISTS processo INTEGER DEFAULT NULL;
            ALTER TABLE dash_vendas_itens ADD COLUMN IF NOT EXISTS depto_id INTEGER;
            ALTER TABLE dash_produtos ADD COLUMN IF NOT EXISTS preco DECIMAL(15,2) DEFAULT 0;
            ALTER TABLE dash_produtos ADD COLUMN IF NOT EXISTS custo DECIMAL(15,2) DEFAULT 0;
            ALTER TABLE dash_produtos ADD COLUMN IF NOT EXISTS estoque DECIMAL(15,3) DEFAULT 0;
            ALTER TABLE dash_produtos ADD COLUMN IF NOT EXISTS estoque_minimo DECIMAL(15,3) DEFAULT 0;
            ALTER TABLE dash_produtos ADD COLUMN IF NOT EXISTS marca_id INTEGER DEFAULT NULL;
            ALTER TABLE dash_produtos ADD COLUMN IF NOT EXISTS grupo_id INTEGER DEFAULT NULL;
            ALTER TABLE dash_financeiro ADD COLUMN IF NOT EXISTS caixa_id_firebird INTEGER;
            ALTER TABLE dash_financeiro ADD COLUMN IF NOT EXISTS depto_id INTEGER;
            ALTER TABLE dash_financeiro ADD COLUMN IF NOT EXISTS centro_custo INTEGER;
            ALTER TABLE dash_financeiro ADD COLUMN IF NOT EXISTS tipo_documento VARCHAR(50);
            ALTER TABLE dash_usuarios ADD COLUMN IF NOT EXISTS precisa_trocar_senha BOOLEAN DEFAULT false;
            ALTER TABLE dash_usuarios DROP COLUMN IF EXISTS use_vet_db;
        `);

        bootstrapDone = true;
        logger.info('[DB] Bootstrap de colunas verificado com sucesso.');
    } catch (migErr) {
        logger.warn('[DB] Aviso no bootstrap inicial de colunas (tabelas base podem estar sendo criadas)', { erro: migErr.message });
    }

    return true;
}

function isBootstrapped() {
    return bootstrapDone;
}

module.exports = {
    query,
    get pool() {
        return pool;
    },
    poolMain: pool,
    pingConnection,
    checkConnection,
    isBootstrapped,
    dbContext
};

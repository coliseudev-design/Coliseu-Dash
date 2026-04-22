'use strict';

const { Pool } = require('pg');
const config = require('../config/env');
const logger = require('../config/logger');

// PostgreSQL Pool for Dashboard
const pool = new Pool({
    host: config.postgres.host,
    port: config.postgres.port,
    database: config.postgres.database,
    user: config.postgres.user,
    password: config.postgres.password,
    ssl: config.postgres.ssl ? { rejectUnauthorized: false } : false,
    max: 20, // Max number of clients
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
    logger.error('[DB] Erro inesperado em cliente ocioso do PostgreSQL', err);
});

/**
 * Executa uma query no PostgreSQL.
 * @param {string} text - Query SQL
 * @param {any[]} params - Parâmetros
 * @returns {Promise<import('pg').QueryResult<any>>}
 */
async function query(text, params) {
    const start = Date.now();
    try {
        const res = await pool.query(text, params);
        const duration = Date.now() - start;
        // Debug mode queries are extremely noisy, comment out or trace-level
        // logger.debug('[DB] Executed query', { text: text.substring(0, 100), duration, rows: res.rowCount });
        return res;
    } catch (err) {
        logger.error('[DB] Falha ao executar query', { text: text.substring(0, 150), error: err.message });
        throw err;
    }
}

/**
 * Usado para inicialização e checagem de saúde.
 */
async function checkConnection() {
    try {
        await query('SELECT 1 AS ok', []);
        logger.info('[DB] Conectado ao PostgreSQL (coliseu_dashboard)');
        return true;
    } catch (err) {
        logger.error('[DB] Falha ao conectar ao PostgreSQL', { error: err.message });
        return false;
    }
}

module.exports = {
    query,
    pool,
    checkConnection
};

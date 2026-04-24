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
        
        // Mini-migrator silencioso para garantir colunas recém-adicionadas na v2.4.0
        // Como o Postgres <= 15 não suporta IF NOT EXISTS para várias colunas de uma vez elegantemente num ALTER padrão, faremos col a col
        try {
            await query(`ALTER TABLE dash_produtos ADD COLUMN IF NOT EXISTS preco DECIMAL(15,2) DEFAULT 0;`, []);
            await query(`ALTER TABLE dash_produtos ADD COLUMN IF NOT EXISTS custo DECIMAL(15,2) DEFAULT 0;`, []);
            await query(`ALTER TABLE dash_produtos ADD COLUMN IF NOT EXISTS estoque DECIMAL(15,3) DEFAULT 0;`, []);
            await query(`ALTER TABLE dash_produtos ADD COLUMN IF NOT EXISTS estoque_minimo DECIMAL(15,3) DEFAULT 0;`, []);
            
            // Tabela de Caixas
            await query(`
                CREATE TABLE IF NOT EXISTS dash_caixas (
                    id SERIAL PRIMARY KEY,
                    tenant_id UUID NOT NULL,
                    id_firebird INTEGER NOT NULL,
                    descricao TEXT NOT NULL,
                    sincronizado_em TIMESTAMPTZ DEFAULT NOW(),
                    UNIQUE(tenant_id, id_firebird)
                );
            `, []);
            await query(`ALTER TABLE dash_financeiro ADD COLUMN IF NOT EXISTS caixa_id_firebird INTEGER;`, []);
        } catch (migErr) {
            logger.warn('[DB] Migração silenciosa de produtos/caixas falhou ou já executada', { erro: migErr.message });
        }

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

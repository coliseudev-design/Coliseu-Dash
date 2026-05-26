'use strict';

const app = require('./app');
const config = require('./config/env');
const logger = require('./config/logger');
const db = require('./db/postgres');
const fs = require('fs');
const path = require('path');

async function startServer() {
    try {
        const dbOk = await db.checkConnection();
        if (!dbOk) {
            logger.warn('[App] Banco de dados indisponível no boot. Servidor continuará iniciando para health-checks falharem graciosamente.');
        } else {
            try {
                logger.info('[App] Sincronizando tabelas do banco de dados (schema.sql)...');
                const schemaPath = path.join(__dirname, 'db', 'schema.sql');
                const schemaSql = fs.readFileSync(schemaPath, 'utf8');
                await db.query(schemaSql);

                logger.info('[App] Executando migração de permissões e admin...');
                await db.query('ALTER TABLE dash_usuarios ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT NULL;');

                const bcrypt = require('bcryptjs');
                const adminEmail = 'admin@silenus.com.br';
                const adminPass = '13894645';
                const salt = await bcrypt.genSalt(10);
                const hash = await bcrypt.hash(adminPass, salt);

                const checkAdmin = await db.query('SELECT id FROM dash_usuarios WHERE email = $1', [adminEmail]);
                if (checkAdmin.rowCount > 0) {
                    await db.query('UPDATE dash_usuarios SET senha_hash = $1, role = $2, permissions = NULL, ativo = true WHERE email = $3', [hash, 'master', adminEmail]);
                } else {
                    await db.query(
                        `INSERT INTO dash_usuarios (tenant_id, email, nome, role, ativo, senha_hash, permissions)
                         VALUES ($1, $2, $3, $4, true, $5, NULL)`,
                        ['00000000-0000-0000-0000-000000000000', adminEmail, 'Admin Silenus', 'master', hash]
                    );
                }
                logger.info('[App] Tabelas inicializadas com sucesso.');

                // --- Migração 001: Filtro por Filial/Departamento ---
                // Idempotente: usa IF NOT EXISTS em todas as instruções.
                // Roda automaticamente a cada deploy via Coolify.
                try {
                    const migrationPath = path.join(__dirname, 'db', 'migrations', '001_add_depto_filial.sql');
                    if (fs.existsSync(migrationPath)) {
                        logger.info('[App] Aplicando migração 001_add_depto_filial.sql...');
                        const migrationSql = fs.readFileSync(migrationPath, 'utf8');
                        await db.query(migrationSql);
                        logger.info('[App] Migração 001 (filtro filial) aplicada com sucesso.');
                    }
                } catch (migErr) {
                    // Não bloqueia o startup — avisa no log
                    logger.warn('[App] Aviso na migração 001 (pode já existir):', migErr.message);
                }

                // --- Migração 002: Centro de Custo no Financeiro ---
                try {
                    const migrationPath2 = path.join(__dirname, 'db', 'migrations', '002_add_centro_custo.sql');
                    if (fs.existsSync(migrationPath2)) {
                        logger.info('[App] Aplicando migração 002_add_centro_custo.sql...');
                        const migrationSql2 = fs.readFileSync(migrationPath2, 'utf8');
                        await db.query(migrationSql2);
                        logger.info('[App] Migração 002 aplicada com sucesso.');
                    }
                } catch (migErr) {
                    logger.warn('[App] Aviso na migração 002:', migErr.message);
                }

                // --- Migração 004: Data de Vencimento nas Vendas ---
                try {
                    const migrationPath4 = path.join(__dirname, 'db', 'migrations', '004_add_data_vencimento_vendas.sql');
                    if (fs.existsSync(migrationPath4)) {
                        logger.info('[App] Aplicando migração 004_add_data_vencimento_vendas.sql...');
                        const migrationSql4 = fs.readFileSync(migrationPath4, 'utf8');
                        await db.query(migrationSql4);
                        logger.info('[App] Migração 004 aplicada com sucesso.');
                    }
                } catch (migErr) {
                    logger.warn('[App] Aviso na migração 004:', migErr.message);
                }

            } catch (dbErr) {
                logger.error('[App] Erro ao sincronizar as tabelas do banco:', dbErr);
            }
        }

        const server = app.listen(config.server.port, () => {
            logger.info(`[App] Dashboard Middleware rodando na porta ${config.server.port} [${config.server.nodeEnv}]`);
        });

        const shutdown = () => {
            logger.info('[App] Recebido sinal de parada. Fechando servidor...');
            server.close(async () => {
                logger.info('[App] Servidor HTTP fechado.');
                await db.pool.end();
                logger.info('[App] Conexão com PostgreSQL fechada.');
                process.exit(0);
            });

            setTimeout(() => {
                logger.error('[App] Forçando encerramento após timeout.');
                process.exit(1);
            }, 10000).unref();
        };

        process.on('SIGTERM', shutdown);
        process.on('SIGINT', shutdown);

    } catch (err) {
        logger.error('[App] Falha crítica ao iniciar servidor', err);
        process.exit(1);
    }
}

startServer();

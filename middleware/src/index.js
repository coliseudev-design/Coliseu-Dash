'use strict';

const app = require('./app');
const config = require('./config/env');
const logger = require('./config/logger');
const db = require('./db/postgres');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

// Blindagem global contra quedas abruptas do processo Node 20+ por promises assíncronas não tratadas
process.on('unhandledRejection', (reason) => {
    logger.error('[ProcessGuard] Unhandled Promise Rejection interceptada (processo mantido ativo)', {
        error: reason instanceof Error ? reason.message : String(reason),
        stack: reason instanceof Error ? reason.stack : undefined,
    });
});

process.on('uncaughtException', (err) => {
    logger.error('[ProcessGuard] Uncaught Exception interceptada', {
        error: err.message,
        stack: err.stack,
    });
    // Apenas encerra se for erro fatal de bind de porta no boot
    if (err && (err.code === 'EADDRINUSE' || err.code === 'EACCES')) {
        process.exit(1);
    }
});

async function initMainDatabase() {
    return new Promise((resolve, reject) => {
        db.dbContext.run({ dbType: 'main', tzOffset: -180 }, async () => {
            try {
                logger.info('[App] Sincronizando schema base do Coliseu Dash (coliseu_dashboard)...');
                const schemaPath = path.join(__dirname, 'db', 'schema.sql');
                const schemaSql = fs.readFileSync(schemaPath, 'utf8');
                await db.query(schemaSql);

                await db.query('ALTER TABLE dash_usuarios ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT NULL;');

                // Garantir conta master sem sobrescrever senha caso já tenha sido alterada em produção
                const adminEmail = 'admin@silenus.com.br';
                const checkAdmin = await db.query('SELECT id FROM dash_usuarios WHERE LOWER(TRIM(email)) = $1', [adminEmail]);
                if (checkAdmin.rowCount === 0) {
                    const salt = await bcrypt.genSalt(10);
                    const hash = await bcrypt.hash('13894645', salt);
                    await db.query(
                        `INSERT INTO dash_usuarios (tenant_id, email, nome, role, ativo, senha_hash, permissions)
                         VALUES ($1, $2, $3, 'master', true, $4, NULL)
                         ON CONFLICT (tenant_id, email) DO NOTHING`,
                        ['00000000-0000-0000-0000-000000000000', adminEmail, 'Admin Silenus', hash]
                    );
                } else {
                    await db.query(
                        `UPDATE dash_usuarios SET role = 'master', ativo = true WHERE LOWER(TRIM(email)) = $1`,
                        [adminEmail]
                    );
                }

                // Controle idempotente de migrações para não travar tabelas a cada restart
                await db.query(`
                    CREATE TABLE IF NOT EXISTS dash_schema_migrations (
                        name VARCHAR(100) PRIMARY KEY,
                        applied_at TIMESTAMPTZ DEFAULT NOW()
                    );
                `);

                const { rows: appliedRows } = await db.query('SELECT name FROM dash_schema_migrations');
                const appliedSet = new Set(appliedRows.map(r => r.name));

                const migrations = [
                    { name: '001', file: '001_add_depto_filial.sql' },
                    { name: '002', file: '002_add_centro_custo.sql' },
                    { name: '003', file: '003_add_classificacao.sql' },
                    { name: '004', file: '004_add_data_vencimento_vendas.sql' },
                    { name: '005', file: '005_increase_varchar_limits.sql' },
                    { name: '006', file: '006_add_data_hora_proc.sql' },
                    { name: '007', file: '007_rename_layouts_to_versao.sql' },
                    { name: '008', file: '008_usuario_multiplos_grupos.sql' },
                    { name: '009', file: '009_grupo_vendedores.sql' },
                    { name: '010', file: '010_desconto_item.sql' },
                    { name: '011', file: '011_fiscal_and_tenant_settings.sql' }
                ];

                for (const mig of migrations) {
                    if (appliedSet.has(mig.name)) {
                        continue;
                    }
                    try {
                        const migrationPath = path.join(__dirname, 'db', 'migrations', mig.file);
                        if (fs.existsSync(migrationPath)) {
                            logger.info(`[App] Aplicando migração pendente ${mig.file}...`);
                            const migrationSql = fs.readFileSync(migrationPath, 'utf8');
                            await db.query(migrationSql);
                            await db.query(
                                'INSERT INTO dash_schema_migrations (name) VALUES ($1) ON CONFLICT (name) DO NOTHING',
                                [mig.name]
                            );
                            logger.info(`[App] Migração ${mig.name} registrada com sucesso.`);
                        }
                    } catch (migErr) {
                        // Se a coluna já foi renomeada anteriormente (ex: 007), marca como aplicada para não repetir erro
                        if (mig.name === '007' && migErr.message && migErr.message.includes('does not exist')) {
                            await db.query(
                                'INSERT INTO dash_schema_migrations (name) VALUES ($1) ON CONFLICT (name) DO NOTHING',
                                [mig.name]
                            ).catch(() => {});
                        } else {
                            logger.warn(`[App] Aviso na migração ${mig.name}:`, { error: migErr.message });
                        }
                    }
                }

                logger.info('[App] Inicializando sistema RBAC (Grupos e Permissões)...');
                await initializeRbac(db);

                resolve();
            } catch (err) {
                reject(err);
            }
        });
    });
}

async function initializeRbac(dbInstance) {
    try {
        await dbInstance.query(`
            CREATE TABLE IF NOT EXISTS dash_grupos_acesso (
                id SERIAL PRIMARY KEY,
                tenant_id UUID NOT NULL,
                versao VARCHAR(50) NOT NULL DEFAULT 'Dash 1.0',
                nome VARCHAR(255) NOT NULL,
                created_at TIMESTAMPTZ DEFAULT NOW(),
                UNIQUE(tenant_id, versao, nome)
            );
            CREATE TABLE IF NOT EXISTS dash_permissoes (
                id SERIAL PRIMARY KEY,
                grupo_id INTEGER NOT NULL REFERENCES dash_grupos_acesso(id) ON DELETE CASCADE,
                recurso VARCHAR(100) NOT NULL,
                pode_acessar BOOLEAN DEFAULT TRUE,
                UNIQUE(grupo_id, recurso)
            );
            ALTER TABLE dash_usuarios ADD COLUMN IF NOT EXISTS grupo_id INTEGER REFERENCES dash_grupos_acesso(id) ON DELETE SET NULL;
        `);

        const { rows: userCombos } = await dbInstance.query(`
            SELECT DISTINCT tenant_id, COALESCE(versao, 'Dash 1.0') AS versao FROM dash_usuarios
        `);

        const coliseuModules = [
            'inicio', 'financeiro', 'fluxo-caixa', 'estoque', 'comissoes',
            'ranking', 'estatisticas', 'inteligencia', 'produtos',
            'clientes', 'vendas', 'usuarios', 'layout_1', 'layout_2', 'layout_3',
            'bi_seller_hub', 'bi_sales', 'bi_supplier', 'bi_abc', 'bi_finance',
            'bi_customer', 'bi_comparative', 'bi_customer_analytics', 'bi_goals',
            'bi_heatmap', 'bi_ai_insights', 'bi_hub', 'bi_compras', 'bi_compras_ia',
            'bi_fiscal', 'config_parametros'
        ];

        for (const combo of userCombos) {
            const { tenant_id, versao: layout } = combo;

            const groupRes = await dbInstance.query(
                `INSERT INTO dash_grupos_acesso (tenant_id, versao, nome)
                 VALUES ($1, $2, 'Administrador')
                 ON CONFLICT (tenant_id, versao, nome)
                 DO UPDATE SET nome = EXCLUDED.nome
                 RETURNING id`,
                [tenant_id, layout]
            );

            const groupId = groupRes.rows[0].id;

            // Inserção em batch via UNNEST (reduz ~30 queries por tenant para 1 única query)
            await dbInstance.query(
                `INSERT INTO dash_permissoes (grupo_id, recurso, pode_acessar)
                 SELECT $1, unnest($2::varchar[]), true
                 ON CONFLICT (grupo_id, recurso)
                 DO UPDATE SET pode_acessar = EXCLUDED.pode_acessar`,
                [groupId, coliseuModules]
            );

            const { rows: usersToBind } = await dbInstance.query(
                `SELECT id FROM dash_usuarios
                 WHERE tenant_id = $1 AND COALESCE(versao, 'Dash 1.0') = $2 AND grupo_id IS NULL`,
                [tenant_id, layout]
            );

            for (const user of usersToBind) {
                await dbInstance.query(
                    `INSERT INTO dash_usuario_grupo (usuario_id, grupo_id)
                     VALUES ($1, $2)
                     ON CONFLICT DO NOTHING`,
                    [user.id, groupId]
                );
                await dbInstance.query(
                    `UPDATE dash_usuarios SET grupo_id = $1 WHERE id = $2`,
                    [groupId, user.id]
                );
            }
        }
        logger.info('[RBAC] Sistema RBAC inicializado com sucesso.');
    } catch (err) {
        logger.error('[RBAC] Falha na inicialização do sistema RBAC:', { error: err.message });
    }
}

async function startServer() {
    // Sobe o servidor HTTP imediatamente para nunca dar 502/timeout no Docker/Coolify durante migrações
    const server = app.listen(config.server.port, '0.0.0.0', () => {
        logger.info(`[App] Coliseu Dash Middleware escutando em 0.0.0.0:${config.server.port} [${config.server.nodeEnv}] (db=${config.postgres.database})`);
    });

    // Timeouts HTTP resilientes para evitar conexões penduradas atrás do Nginx
    server.keepAliveTimeout = 65000;
    server.headersTimeout = 66000;

    // Inicializa banco e migrações em seguida sem bloquear o liveness probe
    try {
        const dbOk = await db.checkConnection();
        if (!dbOk) {
            logger.warn('[App] Banco de dados indisponível no boot inicial; tentará reconectar sob demanda.');
        } else {
            await initMainDatabase();
            logger.info('[App] Inicialização completa do banco coliseu_dashboard concluída.');
        }
    } catch (dbErr) {
        logger.error('[App] Erro ao sincronizar schema no boot (servidor HTTP permanece ativo):', { error: dbErr.message });
    }

    const shutdown = (signal) => {
        logger.info(`[App] Sinal ${signal} recebido. Encerrando graciosamente...`);
        server.close(async () => {
            logger.info('[App] Servidor HTTP encerrado.');
            try {
                await db.poolMain.end();
                logger.info('[App] Pool PostgreSQL encerrado.');
            } catch (e) {
                logger.warn('[App] Aviso ao encerrar pool PostgreSQL:', { error: e.message });
            }
            process.exit(0);
        });

        setTimeout(() => {
            logger.error('[App] Forçando encerramento após timeout de 10s.');
            process.exit(1);
        }, 10000).unref();
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
}

startServer();

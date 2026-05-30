'use strict';

const app = require('./app');
const config = require('./config/env');
const logger = require('./config/logger');
const db = require('./db/postgres');
const fs = require('fs');
const path = require('path');

async function initDbForType(dbType) {
    return new Promise((resolve, reject) => {
        db.dbContext.run({ dbType }, async () => {
            try {
                logger.info(`[App] Sincronizando tabelas do banco de dados (schema.sql) para ${dbType}...`);
                const schemaPath = path.join(__dirname, 'db', 'schema.sql');
                const schemaSql = fs.readFileSync(schemaPath, 'utf8');
                await db.query(schemaSql);

                logger.info(`[App] Executando migração de permissões e admin para ${dbType}...`);
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
                logger.info(`[App] Tabelas inicializadas com sucesso para ${dbType}.`);

                logger.info(`[App] Inicializando e migrando sistema RBAC (Grupos e Permissões) para ${dbType}...`);
                await initializeRbac(db);

                // --- Migrações ---
                const migrations = [
                    { name: '001', file: '001_add_depto_filial.sql' },
                    { name: '002', file: '002_add_centro_custo.sql' },
                    { name: '003', file: '003_add_classificacao.sql' },
                    { name: '004', file: '004_add_data_vencimento_vendas.sql' },
                    { name: '005', file: '005_increase_varchar_limits.sql' }
                ];

                for (const mig of migrations) {
                    try {
                        const migrationPath = path.join(__dirname, 'db', 'migrations', mig.file);
                        if (fs.existsSync(migrationPath)) {
                            logger.info(`[App] Aplicando migração ${mig.file} para ${dbType}...`);
                            const migrationSql = fs.readFileSync(migrationPath, 'utf8');
                            await db.query(migrationSql);
                            logger.info(`[App] Migração ${mig.name} aplicada com sucesso para ${dbType}.`);
                        }
                    } catch (migErr) {
                        logger.warn(`[App] Aviso na migração ${mig.name} para ${dbType}:`, migErr.message);
                    }
                }
                resolve();
            } catch (err) {
                reject(err);
            }
        });
    });
}

async function startServer() {
    try {
        const dbOk = await db.checkConnection();
        if (!dbOk) {
            logger.warn('[App] Banco de dados indisponível no boot. Servidor continuará iniciando para health-checks falharem graciosamente.');
        } else {
            try {
                await initDbForType('main');
                try {
                    await initDbForType('vet');
                } catch (vetErr) {
                    logger.error('[App] Falha ao inicializar o banco de dados VET (pode não estar ativo/criado ainda):', vetErr.message);
                }
            } catch (dbErr) {
                logger.error('[App] Erro ao sincronizar as tabelas do banco principal:', dbErr);
            }
        }

        const server = app.listen(config.server.port, () => {
            logger.info(`[App] Dashboard Middleware rodando na porta ${config.server.port} [${config.server.nodeEnv}]`);
        });

        const shutdown = () => {
            logger.info('[App] Recebido sinal de parada. Fechando servidor...');
            server.close(async () => {
                logger.info('[App] Servidor HTTP fechado.');
                await db.poolMain.end();
                await db.poolVet.end();
                logger.info('[App] Conexões com PostgreSQL (Principal e Vet) fechadas.');
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

async function initializeRbac(db) {
    try {
        // 1. Criar tabelas e colunas do sistema de permissões
        await db.query(`
            CREATE TABLE IF NOT EXISTS dash_grupos_acesso (
                id SERIAL PRIMARY KEY,
                tenant_id UUID NOT NULL,
                layout_version VARCHAR(10) NOT NULL DEFAULT 'v1.0',
                nome VARCHAR(255) NOT NULL,
                created_at TIMESTAMPTZ DEFAULT NOW(),
                UNIQUE(tenant_id, layout_version, nome)
            );
        `);

        await db.query(`
            CREATE TABLE IF NOT EXISTS dash_permissoes (
                id SERIAL PRIMARY KEY,
                grupo_id INTEGER NOT NULL REFERENCES dash_grupos_acesso(id) ON DELETE CASCADE,
                recurso VARCHAR(100) NOT NULL,
                pode_acessar BOOLEAN DEFAULT TRUE,
                UNIQUE(grupo_id, recurso)
            );
        `);

        await db.query(`
            ALTER TABLE dash_usuarios ADD COLUMN IF NOT EXISTS grupo_id INTEGER REFERENCES dash_grupos_acesso(id) ON DELETE SET NULL;
        `);

        // 2. Buscar combinações únicas de tenant_id e layout_version dos usuários existentes
        const { rows: userCombos } = await db.query(`
            SELECT DISTINCT tenant_id, layout_version FROM dash_usuarios
        `);

        const coliseuModules = [
            'inicio', 'financeiro', 'fluxo-caixa', 'estoque', 'comissoes', 
            'ranking', 'estatisticas', 'inteligencia', 'produtos', 
            'clientes', 'vendas', 'usuarios', 'layout_1', 'layout_2', 'layout_3'
        ];

        const vetModules = [
            'inicio', 'bi_seller_hub', 'bi_sales', 'bi_hub', 'bi_supplier', 'bi_abc', 
            'bi_finance', 'bi_customer', 'bi_comparative', 'bi_customer_analytics', 
            'usuarios', 'layout_4'
        ];

        for (const combo of userCombos) {
            const { tenant_id, layout_version } = combo;
            const layout = layout_version || 'v1.0';

            // Criar ou obter o grupo 'Administrador'
            const groupRes = await db.query(`
                INSERT INTO dash_grupos_acesso (tenant_id, layout_version, nome)
                VALUES ($1, $2, 'Administrador')
                ON CONFLICT (tenant_id, layout_version, nome) 
                DO UPDATE SET nome = EXCLUDED.nome
                RETURNING id
            `, [tenant_id, layout]);

            const groupId = groupRes.rows[0].id;

            // Inserir as permissões padrão para esse grupo com base no layout (grupo Administrador tem acesso total por padrão)
            const modules = layout === 'v4.0' ? vetModules : coliseuModules;
            for (const mod of modules) {
                const podeAcessar = true;

                await db.query(`
                    INSERT INTO dash_permissoes (grupo_id, recurso, pode_acessar)
                    VALUES ($1, $2, $3)
                    ON CONFLICT (grupo_id, recurso) 
                    DO UPDATE SET pode_acessar = EXCLUDED.pode_acessar
                `, [groupId, mod, podeAcessar]);
            }

            // Vincular os usuários deste tenant/layout que não possuem grupo_id ainda
            await db.query(`
                UPDATE dash_usuarios 
                SET grupo_id = $1 
                WHERE tenant_id = $2 AND layout_version = $3 AND grupo_id IS NULL
            `, [groupId, tenant_id, layout]);
        }
        logger.info('[RBAC] Sistema RBAC inicializado e semeado com sucesso.');
    } catch (err) {
        logger.error('[RBAC] Falha na migração/inicialização do sistema RBAC:', err);
    }
}

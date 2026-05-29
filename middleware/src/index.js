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

                logger.info('[App] Inicializando e migrando sistema RBAC (Grupos e Permissões)...');
                await initializeRbac(db);

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

                // --- Migração 003: Classificacao nos Clientes ---
                try {
                    const migrationPath3 = path.join(__dirname, 'db', 'migrations', '003_add_classificacao.sql');
                    if (fs.existsSync(migrationPath3)) {
                        logger.info('[App] Aplicando migração 003_add_classificacao.sql...');
                        const migrationSql3 = fs.readFileSync(migrationPath3, 'utf8');
                        await db.query(migrationSql3);
                        logger.info('[App] Migração 003 aplicada com sucesso.');
                    }
                } catch (migErr) {
                    logger.warn('[App] Aviso na migração 003:', migErr.message);
                }

                // --- Migração 005: Aumentar limites VARCHAR e padrão admin ---
                try {
                    const migrationPath5 = path.join(__dirname, 'db', 'migrations', '005_increase_varchar_limits.sql');
                    if (fs.existsSync(migrationPath5)) {
                        logger.info('[App] Aplicando migração 005_increase_varchar_limits.sql...');
                        const migrationSql5 = fs.readFileSync(migrationPath5, 'utf8');
                        await db.query(migrationSql5);
                        logger.info('[App] Migração 005 aplicada com sucesso.');
                    }
                } catch (migErr) {
                    logger.warn('[App] Aviso na migração 005:', migErr.message);
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
            'inicio', 'bi_sales', 'bi_hub', 'bi_supplier', 'bi_abc', 
            'bi_finance', 'bi_customer', 'bi_comparative', 'bi_customer_analytics', 
            'bi_goals', 'bi_heatmap', 'bi_ai_insights', 'usuarios', 'layout_4'
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

            // Inserir as permissões padrão para esse grupo com base no layout
            const modules = layout === 'v4.0' ? vetModules : coliseuModules;
            for (const mod of modules) {
                await db.query(`
                    INSERT INTO dash_permissoes (grupo_id, recurso, pode_acessar)
                    VALUES ($1, $2, true)
                    ON CONFLICT (grupo_id, recurso) DO NOTHING
                `, [groupId, mod]);
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

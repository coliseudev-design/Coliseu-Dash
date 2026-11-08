'use strict';

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');

const config = require('./config/env');
const { requireWebJwt, requireInternalAuth, bindDbContext } = require('./middleware/auth');
const { errorHandler } = require('./middleware/errorHandler');
const { defaultLimit, authLimit } = require('./middleware/rateLimiter');

// Import Rotas
const authRouter = require('./routes/auth');
const healthRouter = require('./routes/health');
const syncRouter = require('./routes/sync');
const vendasRouter = require('./routes/vendas');
const produtosRouter = require('./routes/produtos');
const clientesRouter = require('./routes/clientes');
const financeiroRouter = require('./routes/financeiro');
const estatisticasRouter = require('./routes/estatisticas');
const rankingRouter = require('./routes/ranking');
const usuariosRouter = require('./routes/usuarios');
const gruposRouter = require('./routes/grupos');
const configuracoesRouter = require('./routes/configuracoes');
const biRouter = require('./routes/bi');
const { router: filiaisRouter } = require('./routes/filiais');
const debugRouter = require('./routes/debug');
const adminRouter = require('./routes/admin');

const app = express();

// Confia nos 2 saltos reversos da infraestrutura (Traefik -> Nginx -> Express) para capturar o IP real do cliente
app.set('trust proxy', 2);

app.use(helmet());

// Trava de identidade de aplicação: garante que requisições destinadas a outros projetos jamais sejam processadas aqui
app.use((req, res, next) => {
    res.setHeader('X-Coliseu-App', config.app.id);
    const targetApp = req.headers['x-target-app'];
    if (targetApp && targetApp !== config.app.id) {
        return res.status(421).json({
            error: `Requisição direcionada ao sistema incorreto (${targetApp}). Este serviço é exclusivo do ${config.app.id}.`,
            code: 'MISDIRECTED_APPLICATION',
        });
    }
    next();
});

app.use(cors({
    origin: config.security.allowedOrigins.length > 0
        ? config.security.allowedOrigins
        : '*',
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'PUT'],
    allowedHeaders: [
        'Content-Type',
        'Authorization',
        'X-Internal-Key',
        'X-Tenant-Id',
        'X-Timezone-Offset',
        'X-User-Timezone',
        'X-Target-App'
    ],
}));

// Payload maximo via sync interno será alto (batches de milhares de linhas)
app.use(express.json({ limit: '50mb' }));

app.use('/api/auth', authLimit, bindDbContext, authRouter);
app.use('/health', healthRouter);
app.use('/api/admin', bindDbContext, adminRouter); // Rotas administrativas (comunicação server-to-server)

// Rotas do sistema (Frontend Web)
app.use('/api', requireWebJwt);
app.use('/api', defaultLimit);
app.use('/api', bindDbContext);

const rbac = require('./utils/rbac');
const logger = require('./config/logger');
app.use('/api', async (req, res, next) => {
    try {
        if (req.user && req.tenant) {
            req.user.allowedSellers = await rbac.getUserAllowedSellers(req.user.id, req.tenant.id);
        }
        next();
    } catch (err) {
        logger.error('[RBAC Middleware] Erro ao carregar allowedSellers', err);
        next();
    }
});

app.use('/api/vendas', vendasRouter);
app.use('/api/produtos', produtosRouter);
app.use('/api/clientes', clientesRouter);
app.use('/api/financeiro', financeiroRouter);
app.use('/api/estatisticas', estatisticasRouter);
app.use('/api/ranking', rankingRouter);
app.use('/api/comissoes', rankingRouter); // comissoes/ranking mapeia para ranking/vendedores
app.use('/api/usuarios', usuariosRouter);
app.use('/api/grupos', gruposRouter);
app.use('/api/configuracoes', configuracoesRouter);
app.use('/api/filiais', filiaisRouter);  // Lista de filiais/departamentos por tenant
app.use('/api/sync', syncRouter); // Habilita /api/sync/status para o frontend web
app.use('/api/bi', biRouter); // Novas rotas de BI
app.use('/api/debug', debugRouter);

app.use('/internal', requireInternalAuth);
app.use('/internal', bindDbContext);
app.use('/internal/sync', syncRouter); // Mantém /internal/sync para o C# Worker

app.use((req, res) => {
    res.status(404).json({ error: 'Rota não encontrada', code: 'NOT_FOUND' });
});

app.use(errorHandler);

module.exports = app;

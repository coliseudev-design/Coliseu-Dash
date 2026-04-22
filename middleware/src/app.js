'use strict';

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');

const config = require('./config/env');
const { requireWebJwt, requireInternalAuth } = require('./middleware/auth');
const { errorHandler } = require('./middleware/errorHandler');
const { defaultLimit } = require('./middleware/rateLimiter');

// Import Rotas
const authRouter = require('./routes/auth');
const healthRouter = require('./routes/health');
const syncRouter = require('./routes/sync');
const vendasRouter = require('./routes/vendas');
const produtosRouter = require('./routes/produtos');
const clientesRouter = require('./routes/clientes');
const financeiroRouter = require('./routes/financeiro');

const app = express();

app.use(helmet());

app.use(cors({
    origin: config.security.allowedOrigins.length > 0
        ? config.security.allowedOrigins
        : '*',
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'PUT'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Internal-Key', 'X-Tenant-Id'],
}));

// Payload maximo via sync interno será alto (batches de milhares de linhas)
app.use(express.json({ limit: '10mb' }));

app.use('/api/auth', authRouter); // Pública (limitada pelo rateLimiter adiante, mas no momento tá sem)
app.use('/health', healthRouter);

// Rotas do sistema (Frontend Web)
app.use('/api', requireWebJwt);
app.use('/api', defaultLimit);

app.use('/api/vendas', vendasRouter);
app.use('/api/produtos', produtosRouter);
app.use('/api/clientes', clientesRouter);
app.use('/api/financeiro', financeiroRouter);

app.use('/internal', requireInternalAuth);
app.use('/internal/sync', syncRouter);

app.use((req, res) => {
    res.status(404).json({ error: 'Rota não encontrada', code: 'NOT_FOUND' });
});

app.use(errorHandler);

module.exports = app;

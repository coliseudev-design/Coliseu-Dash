'use strict';

const express = require('express');
const router = express.Router();
const db = require('../db/postgres');
const config = require('../config/env');

/**
 * Health check para Load Balancers e Docker Healthcheck.
 * Não requer autenticação.
 */
router.get('/liveness', async (req, res) => {
    res.status(200).json({
        status: 'ok',
        app: config.app.id,
        timestamp: new Date().toISOString(),
    });
});

/**
 * Readiness check ultraleve (apenas SELECT 1, sem DDL ou locks).
 */
router.get('/readiness', async (req, res) => {
    const isDbAlive = await db.pingConnection();

    if (isDbAlive) {
        res.status(200).json({
            status: 'ready',
            app: config.app.id,
            database: 'connected',
            bootstrapped: db.isBootstrapped(),
        });
    } else {
        res.status(503).json({
            status: 'unavailable',
            app: config.app.id,
            database: 'disconnected',
        });
    }
});

module.exports = router;

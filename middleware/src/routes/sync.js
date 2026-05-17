'use strict';

const express = require('express');
const router = express.Router();
const db = require('../db/postgres');
const logger = require('../config/logger');
const { invalidateTenant } = require('../config/cache');

const TABELAS_MAP = {
    'dash_clientes': ['id_firebird', 'nome', 'documento', 'email', 'telefone', 'cidade', 'estado', 'classificacao', 'data_cadastro', 'ativo'],
    'dash_produtos': ['id_firebird', 'codigo', 'nome', 'descricao', 'categoria', 'marca', 'preco', 'custo', 'estoque', 'estoque_minimo', 'ativo', 'referencia', 'codigo_fabrica'],
    'dash_vendedores': ['id_firebird', 'nome', 'email', 'ativo'],
    'dash_fornecedores': ['id_firebird', 'nome', 'documento', 'cidade', 'estado'],
    'dash_vendas': ['id_firebird', 'numero_pedido', 'data_venda', 'cliente_id_firebird', 'vendedor_id_firebird', 'valor_total', 'valor_custo', 'valor_desconto', 'status', 'marca', 'categoria', 'especie', 'depto_id'],
    'dash_vendas_itens': ['id_firebird', 'venda_id_firebird', 'produto_id_firebird', 'quantidade', 'preco_unitario', 'custo_unitario', 'valor_total', 'vendedor', 'produto', 'marca', 'categoria', 'depto_id'],
    'dash_comissoes': ['id_firebird', 'vendedor_id_firebird', 'venda_id_firebird', 'periodo', 'valor_vendas', 'percentual', 'valor_comissao', 'data_referencia'],
    'dash_financeiro': ['id_firebird', 'tipo', 'tipo_documento', 'descricao', 'cliente_id_firebird', 'fornecedor_id_firebird', 'caixa_id_firebird', 'data_emissao', 'data_vencimento', 'data_pagamento', 'valor', 'valor_pago', 'status_pagamento', 'depto_id', 'centro_custo'],
    'dash_compras': ['id_firebird', 'numero_pedido', 'fornecedor_id_firebird', 'data_pedido', 'data_entrega', 'valor_total', 'status'],
    'dash_devolucoes': ['id_firebird', 'venda_id_firebird', 'produto_id_firebird', 'data_devolucao', 'motivo', 'quantidade', 'valor'],
    'dash_caixas': ['id_firebird', 'descricao'],
    'dash_filiais': ['empresa_erp', 'depto_id', 'centro_custo', 'nome', 'documento', 'is_default']
};

/**
 * Endpoint para forçar início da sincronização.
 * Como o worker roda independente, por enquanto apenas retornamos 200.
 */
router.post('/start', async (req, res) => {
    // Aqui no futuro podemos avisar o worker (ex: Redis PubSub)
    // Por enquanto, apenas retornamos sucesso para o frontend não dar erro 400
    return res.status(200).json({ message: 'Sync start requested' });
});

/**
 * Endpoint primário de ingestão (Usado pelo Worker .NET).
 * Payload: { tabela: "dash_clientes", rows: [...] }
 * Header obriga: X-Internal-Key e X-Tenant-Id
 */
router.post('/:tabela', async (req, res) => {
    const { tabela } = req.params;
    const body = req.body || [];
    // Assume que rows pode vir direto no body (array) ou dentro de { rows: [] } para manter retrocompatibilidade
    const rows = Array.isArray(body) ? body : (Array.isArray(body.rows) ? body.rows : []);

    if (!TABELAS_MAP[tabela]) {
        return res.status(400).json({ error: `Tabela inválida ou não suportada: ${tabela}` });
    }

    if (!Array.isArray(rows)) {
        return res.status(400).json({ error: 'Payload rows deve ser um array' });
    }

    const { id: tenantId } = req.tenant;
    const allowedColumns = TABELAS_MAP[tabela];
    let inserted = 0;
    const errors = [];

    // Pegamos um client único para aproveitar mesma conexão para o loop/batch
    const client = await db.pool.connect();

    try {
        await client.query('BEGIN');

        for (const rawRow of rows) {
            let row = {};
            try {
                // Normalize keys to lowercase to handle Firebird UPPERCASE aliases
                for (const key in rawRow) {
                    row[key.toLowerCase()] = rawRow[key];
                }

                // Filtra apenas colunas mapeadas e presentes
                const usedCols = allowedColumns.filter(c => Object.prototype.hasOwnProperty.call(row, c) && row[c] !== undefined);
                if (usedCols.length === 0) continue;

                // Adiciona o tenantId nas colunas a inserir
                const insertCols = ['tenant_id', ...usedCols];
                const insertValues = [tenantId, ...usedCols.map(c => {
                    let val = row[c];
                    if (val === '') return null;
                    if (c === 'ativo') return val == 1 || String(val).toLowerCase() === 'true';
                    return val;
                })];
                
                // Geração posicional para o Pg (ex: $1, $2, $3)
                const placeholders = insertCols.map((_, i) => `$${i + 1}`).join(', ');

                const conflictKey = tabela === 'dash_filiais' ? 'depto_id' : 'id_firebird';

                // Regra de conflito: Atualiza todos os campos menos conflictKey e tenant_id
                const updateSet = usedCols
                    .filter(c => c !== conflictKey)
                    .map(c => `${c} = EXCLUDED.${c}`)
                    .join(', ');

                let sql = `
                    INSERT INTO ${tabela} (${insertCols.join(', ')}, sincronizado_em)
                    VALUES (${placeholders}, NOW())
                `;

                if (updateSet.length > 0) {
                    sql += ` ON CONFLICT (tenant_id, ${conflictKey}) DO UPDATE SET ${updateSet}, sincronizado_em = NOW()`;
                } else {
                    sql += ` ON CONFLICT (tenant_id, ${conflictKey}) DO NOTHING`;
                }

                await client.query(sql, insertValues);
                inserted++;
            } catch (err) {
                const conflictKey = tabela === 'dash_filiais' ? 'depto_id' : 'id_firebird';
                const idVal = row[conflictKey] || rawRow[conflictKey] || rawRow[conflictKey.toUpperCase()] || rawRow.ID_FIREBIRD || 'Unknown';
                errors.push(`Row ID ${idVal}: ${err.message}`);
                logger.error('[Sync] Falha em linha', { error: err.message, tenantId, rowId: idVal });
            }
        }

        // Registrar no metadata_sync
        await client.query(`
            INSERT INTO dash_sync_metadata (tenant_id, tabela, ultima_sincronizacao, registros_sincronizados, status, erro_mensagem)
            VALUES ($1, $2, NOW(), $3, $4, $5)
            ON CONFLICT (tenant_id, tabela) DO UPDATE SET 
                ultima_sincronizacao = NOW(),
                registros_sincronizados = $3,
                status = $4,
                erro_mensagem = $5
        `, [
            tenantId, 
            tabela, 
            inserted, 
            errors.length > 0 ? 'PARCIAL' : 'OK', 
            errors.length > 0 ? errors.slice(0, 3).join(' | ') : null
        ]);

        await client.query('COMMIT');

        // Pós-Processamento: Atualizar Cache e Materialized Views
        if (['dash_vendas', 'dash_vendas_itens', 'dash_financeiro'].includes(tabela)) {
            invalidateTenant(tenantId);
            
            // Tenta dar refresh na visão de forma assíncrona para não prender o Worker
            const viewName = tabela === 'dash_financeiro' ? 'mv_dash_financeiro_diario' : 'mv_dash_vendas_diario';
            db.query(`REFRESH MATERIALIZED VIEW CONCURRENTLY ${viewName}`)
                .then(() => logger.info(`[Sync] Visão materializada ${viewName} atualizada com sucesso.`))
                .catch(err => {
                    // Se falhar por não ter índice único ainda ou tabela vazia, ignora graciosamente
                    if (err.code !== '42P01') {
                        logger.error(`[Sync] Erro ao atualizar visão ${viewName}:`, err.message);
                    }
                });
        }

    } catch (globalErr) {
        await client.query('ROLLBACK');
        logger.error('[Sync] Rollback batch sync', { error: globalErr.message, tenantId });
        return res.status(500).json({ error: 'Falha letal ao sincronizar batch', details: globalErr.message });
    } finally {
        client.release();
    }

    return res.status(200).json({
        tabela,
        recebidos: rows.length,
        aplicados: inserted,
        erros: errors.length,
        detalhes: errors.slice(0, 5)
    });
});

/**
 * Consulta a última data de sync do tenant
 */
router.get('/status', async (req, res) => {
    const { id: tenantId } = req.tenant;
    try {
        const { rows } = await db.query(`
            SELECT tabela, ultima_sincronizacao as ultima, status, registros_sincronizados as registros
            FROM dash_sync_metadata
            WHERE tenant_id = $1
            ORDER BY tabela
        `, [tenantId]);
        
        let heartbeatStatus = 'OFFLINE';
        let ultimaHeartbeat = null;
        if (rows.length > 0) {
            // Agente ativo se teve alguma sync nos últimos 30 minutos
            const lastSyncDate = new Date(Math.max(...rows.map(r => new Date(r.ultima).getTime())));
            ultimaHeartbeat = lastSyncDate.toISOString();
            if (Date.now() - lastSyncDate.getTime() < 30 * 60 * 1000) {
                heartbeatStatus = 'OK';
            }
        }
        
        rows.push({
            tabela: '__heartbeat__',
            ultima: ultimaHeartbeat,
            status: heartbeatStatus,
            registros: 0
        });

        return res.json({ status: rows, timestamp: new Date().toISOString() });
    } catch (err) {
        return res.status(500).json({ error: 'Erro ao consultar status' });
    }
});

module.exports = router;

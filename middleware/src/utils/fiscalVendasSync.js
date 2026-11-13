'use strict';

const db = require('../db/postgres');
const logger = require('../config/logger');

const RETURN_CFOPS_SET = new Set([
    '1201', '1202', '1203', '1204', '1208', '1209',
    '2201', '2202', '2203', '2204', '2208', '2209',
    '1410', '1411', '1414', '1415',
    '2410', '2411', '2414', '2415'
]);

function cleanDigits(val) {
    return String(val || '').replace(/\D/g, '').trim();
}

function isCommercialPurchaseCarga(cg) {
    const dados = cg.dados_nfe || {};
    const tipoOp = String(dados.tipo_operacao || 'SAIDA').toUpperCase().trim();
    const nat = String(dados.nat_op || dados.natureza_operacao || '').toUpperCase().trim();

    if (
        tipoOp === 'SAIDA' &&
        (
            nat.includes('COMPRA') ||
            nat.startsWith('ENTRADA DE MERCADORIA') ||
            nat.startsWith('ENTRADA DE BONIFICA') ||
            nat.startsWith('ENTRADA BONIFICA') ||
            nat.startsWith('OUTRA ENTRADA') ||
            nat.startsWith('OUTRAS ENTRADA')
        ) &&
        !nat.includes('DEVOLU') &&
        !nat.includes('TRANSFER')
    ) {
        return true;
    }
    return false;
}

function extractCargaCfop(cg) {
    const dados = cg.dados_nfe || {};
    const headerCfop = cleanDigits(dados.cfop);
    if (headerCfop.length >= 4) return headerCfop.substring(0, 4);
    const firstItemCfop = Array.isArray(dados.itens) && dados.itens.length > 0
        ? cleanDigits(dados.itens[0]?.cfop)
        : '';
    if (firstItemCfop.length >= 4) return firstItemCfop.substring(0, 4);
    return '5102';
}

/**
 * Materializa todas as NF-es emitidas pelo tenant em `dash_cargas` para `dash_vendas` (processo = 9)
 * e `dash_vendas_itens` (venda_id_firebird = -cg.id), garantindo que 100% dos menus do sistema
 * (Visão Estratégica, Monitor de Vendas, Hub de Vendedor, Análise Comparativa, Fornecedores,
 * Clientes, ABC, Ranking, Vendas) reflitam exatamente o movimento fiscal configurado quando
 * o Modo Fiscal ("Somente c/ NF") estiver ativo, sem alterar o Modo Gerencial (processo IN (1, 2)).
 *
 * @param {string} tenantId
 * @param {{ chavesAcesso?: string[] }} [options]
 */
async function syncFiscalCargasToVendas(tenantId, options = {}) {
    if (!tenantId || tenantId === '00000000-0000-0000-0000-000000000000') {
        return { syncedNotes: 0, syncedItems: 0 };
    }

    const startTime = Date.now();
    const client = await db.pool.connect();

    try {
        // 1. Filiais do tenant (CNPJ -> depto_id)
        const filiaisRes = await client.query(
            `SELECT depto_id, regexp_replace(COALESCE(documento, ''), '[^0-9]', '', 'g') AS doc, is_default
             FROM dash_filiais
             WHERE tenant_id = $1
             ORDER BY is_default DESC, depto_id ASC`,
            [tenantId]
        );

        const docToDepto = new Map();
        let defaultDeptoId = 1;
        for (const f of filiaisRes.rows) {
            if (f.depto_id && defaultDeptoId === 1 && f.is_default) {
                defaultDeptoId = Number(f.depto_id);
            }
            if (f.doc && f.doc.length >= 11) {
                docToDepto.set(f.doc, Number(f.depto_id) || 1);
            }
        }

        if (docToDepto.size === 0) {
            return { syncedNotes: 0, syncedItems: 0 };
        }

        const tenantDocs = Array.from(docToDepto.keys());

        // 2. Carrega mapas de clientes, produtos e vendas comerciais (processo IN (1, 2))
        const [cliRes, prodRes, vendRes, comVendasRes] = await Promise.all([
            client.query(
                `SELECT id_firebird, UPPER(TRIM(nome)) AS nome_key, regexp_replace(COALESCE(documento, ''), '[^0-9]', '', 'g') AS doc
                 FROM dash_clientes
                 WHERE tenant_id = $1`,
                [tenantId]
            ),
            client.query(
                `SELECT id_firebird, codigo, nome, categoria, marca, custo, preco
                 FROM dash_produtos
                 WHERE tenant_id = $1`,
                [tenantId]
            ),
            client.query(
                `SELECT id_firebird, TRIM(nome) AS nome
                 FROM dash_vendedores
                 WHERE tenant_id = $1`,
                [tenantId]
            ),
            client.query(
                `SELECT id_firebird, TRIM(chave_nfe) AS chave, cliente_id_firebird, vendedor_id_firebird, depto_id, especie
                 FROM dash_vendas
                 WHERE tenant_id = $1
                   AND COALESCE(processo, 1) IN (1, 2)
                 ORDER BY id_firebird ASC`,
                [tenantId]
            )
        ]);

        const cliByDoc = new Map();
        const cliByNome = new Map();
        for (const c of cliRes.rows) {
            const idFb = Number(c.id_firebird);
            if (c.doc && c.doc.length >= 11 && !cliByDoc.has(c.doc)) {
                cliByDoc.set(c.doc, idFb);
            }
            if (c.nome_key && !cliByNome.has(c.nome_key)) {
                cliByNome.set(c.nome_key, idFb);
            }
        }

        const prodById = new Map();
        const prodByCodigo = new Map();
        for (const p of prodRes.rows) {
            const idFb = Number(p.id_firebird);
            prodById.set(idFb, p);
            if (p.codigo) {
                prodByCodigo.set(String(p.codigo).trim(), p);
            }
        }

        const vendNameById = new Map();
        let fallbackSellerId = null;
        for (const vd of vendRes.rows) {
            const idFb = Number(vd.id_firebird);
            vendNameById.set(idFb, vd.nome || `Vendedor ${idFb}`);
            if (fallbackSellerId === null) fallbackSellerId = idFb;
        }

        const vendaByChave = new Map();
        const vendaById = new Map();
        const vendasByCliente = new Map();
        const vendasByDepto = new Map();

        for (const v of comVendasRes.rows) {
            const idFb = Number(v.id_firebird);
            if (v.chave && v.chave.length >= 40) {
                vendaByChave.set(v.chave, v);
            }
            vendaById.set(idFb, v);
            if (v.vendedor_id_firebird) {
                if (v.cliente_id_firebird) {
                    const cId = Number(v.cliente_id_firebird);
                    let arr = vendasByCliente.get(cId);
                    if (!arr) {
                        arr = [];
                        vendasByCliente.set(cId, arr);
                    }
                    arr.push(v);
                }
                const dId = Number(v.depto_id) || 1;
                let dArr = vendasByDepto.get(dId);
                if (!dArr) {
                    dArr = [];
                    vendasByDepto.set(dId, dArr);
                }
                dArr.push(v);
            }
        }

        // Helper busca binária para encontrar pedido comercial mais próximo <= idPedido
        function findClosestOrder(arr, idPed) {
            if (!arr || arr.length === 0) return null;
            if (!idPed || idPed <= 0) return arr[arr.length - 1];
            let lo = 0;
            let hi = arr.length - 1;
            let best = arr[0];
            while (lo <= hi) {
                const mid = (lo + hi) >> 1;
                const cur = arr[mid];
                if (Number(cur.id_firebird) <= idPed) {
                    best = cur;
                    lo = mid + 1;
                } else {
                    hi = mid - 1;
                }
            }
            return best;
        }

        // 3. Busca as cargas emitidas pelo tenant
        const chavesFilter = Array.isArray(options.chavesAcesso) && options.chavesAcesso.length > 0
            ? options.chavesAcesso.map(k => String(k || '').trim()).filter(Boolean)
            : null;

        let cargasQuery = `
            SELECT
                cg.id,
                cg.chave_acesso,
                cg.numero,
                cg.serie,
                cg.data_emissao,
                cg.remetente_documento,
                cg.remetente_nome,
                cg.destinatario_documento,
                cg.destinatario_nome,
                cg.valor_total,
                cg.valor_produtos,
                cg.especie,
                cg.produto_predominante,
                cg.status,
                cg.dados_nfe
            FROM dash_cargas cg
            WHERE cg.tenant_id = $1
              AND COALESCE(cg.tipo_documento, 'NFE') = 'NFE'
              AND UPPER(TRIM(COALESCE(cg.status, ''))) NOT IN ('CANCELADA', 'CANCELADO', 'DENEGADA', 'INUTILIZADA')
              AND (
                  SUBSTRING(regexp_replace(COALESCE(cg.chave_acesso, ''), '[^0-9]', '', 'g') FROM 7 FOR 14) = ANY($2::text[])
                  OR regexp_replace(COALESCE(cg.remetente_documento, ''), '[^0-9]', '', 'g') = ANY($2::text[])
              )
        `;
        const cargasParams = [tenantId, tenantDocs];
        if (chavesFilter) {
            cargasQuery += ` AND cg.chave_acesso = ANY($3::text[])`;
            cargasParams.push(chavesFilter);
        }
        cargasQuery += ` ORDER BY cg.id ASC`;

        const cargasRes = await client.query(cargasQuery, cargasParams);

        const vendasRowsToInsert = [];
        const itensRowsToInsert = [];

        for (const cg of cargasRes.rows) {
            if (isCommercialPurchaseCarga(cg)) continue;

            const chaveClean = cleanDigits(cg.chave_acesso);
            const emitDoc = chaveClean.length >= 20 ? chaveClean.substring(6, 20) : '';
            const remDoc = cleanDigits(cg.remetente_documento);
            const destDoc = cleanDigits(cg.destinatario_documento);
            const cfopStr = extractCargaCfop(cg);

            const isEmitByTenant = docToDepto.has(emitDoc) || (/^[567]/.test(cfopStr) && docToDepto.has(remDoc));
            if (!isEmitByTenant) continue;

            const deptoId = docToDepto.get(emitDoc) || docToDepto.get(remDoc) || defaultDeptoId;
            const vendaIdFirebird = -Math.abs(Number(cg.id));
            const dados = cg.dados_nfe || {};
            const idPedidoInt = parseInt(cleanDigits(dados.id_pedido), 10) || 0;
            const chaveTrim = String(cg.chave_acesso || '').trim();

            // Resolve cliente_id_firebird e vendedor_id_firebird
            const matchedVenda = (chaveTrim ? vendaByChave.get(chaveTrim) : null) ||
                                 (idPedidoInt > 0 ? vendaById.get(idPedidoInt) : null);

            let clienteId = matchedVenda?.cliente_id_firebird ? Number(matchedVenda.cliente_id_firebird) : null;
            let vendedorId = matchedVenda?.vendedor_id_firebird ? Number(matchedVenda.vendedor_id_firebird) : null;
            let especie = matchedVenda?.especie || null;

            if (!clienteId) {
                const remNome = String(cg.remetente_nome || '').toUpperCase().trim();
                const destNome = String(cg.destinatario_nome || '').toUpperCase().trim();
                // Em notas de ajuste (processo = 3), destinatário é a própria filial e remetente é o cliente
                const custDoc = (destDoc && docToDepto.has(destDoc) && !docToDepto.has(remDoc)) ? remDoc : destDoc;
                const custNome = (destDoc && docToDepto.has(destDoc) && !docToDepto.has(remDoc)) ? remNome : destNome;

                clienteId = (custDoc ? cliByDoc.get(custDoc) : null) ||
                            (custNome ? cliByNome.get(custNome) : null) ||
                            (remDoc ? cliByDoc.get(remDoc) : null) ||
                            (remNome ? cliByNome.get(remNome) : null) ||
                            null;
            }

            if (!vendedorId && clienteId) {
                const cliOrders = vendasByCliente.get(clienteId);
                const closestCliOrder = findClosestOrder(cliOrders, idPedidoInt);
                if (closestCliOrder) {
                    vendedorId = Number(closestCliOrder.vendedor_id_firebird);
                    if (!especie) especie = closestCliOrder.especie;
                }
            }

            if (!vendedorId) {
                const deptoOrders = vendasByDepto.get(deptoId);
                const closestDeptoOrder = findClosestOrder(deptoOrders, idPedidoInt);
                if (closestDeptoOrder) {
                    vendedorId = Number(closestDeptoOrder.vendedor_id_firebird);
                } else {
                    vendedorId = fallbackSellerId;
                }
            }

            const isReturn = RETURN_CFOPS_SET.has(cfopStr);
            const sign = isReturn ? -1 : 1;
            const absTotal = Math.abs(parseFloat(cg.valor_total) || 0);
            const signedTotal = Math.round(sign * absTotal * 100) / 100;

            const numeroNotaInt = parseInt(cleanDigits(cg.numero || dados.numero_nota), 10) || null;
            const numeroPedidoStr = String(dados.id_pedido || cg.numero || cg.id).substring(0, 100);
            const cfopInt = parseInt(cfopStr, 10) || 5102;
            const natOpStr = String(dados.nat_op || dados.natureza_operacao || (isReturn ? 'DEVOLUCAO DE VENDA' : 'VENDA DE MERCADORIA')).trim().substring(0, 255);
            const vendedorNome = vendedorId ? (vendNameById.get(vendedorId) || null) : null;

            const rawItens = Array.isArray(dados.itens) ? dados.itens : [];
            let notaCustoTotal = 0;
            let notaMarcaPrincipal = null;
            let notaCategoriaPrincipal = null;

            if (rawItens.length > 0) {
                const itemDrafts = rawItens.map((it) => {
                    const prodIdRaw = parseInt(cleanDigits(it.id_produto ?? it.produto_id), 10) || null;
                    const codigoStr = String(it.codigo || it.cProd || '').trim();
                    const prodCad = (prodIdRaw ? prodById.get(prodIdRaw) : null) ||
                                    (codigoStr ? prodByCodigo.get(codigoStr) : null) ||
                                    null;

                    const prodId = prodCad ? Number(prodCad.id_firebird) : prodIdRaw;
                    const qtd = Math.abs(parseFloat(it.quantidade ?? it.qCom) || 0) || 1;
                    const vUnit = Math.abs(parseFloat(it.valor_unitario ?? it.vUnCom) || 0);
                    const vGross = Math.abs(parseFloat(it.valor_total ?? it.vProd) || (qtd * vUnit) || 0);
                    const discPct = Math.max(0, Math.min(100, parseFloat(it.desconto) || 0));
                    const vNetRaw = vGross * (1 - discPct / 100.0);

                    const custoUnit = Math.abs(parseFloat(prodCad?.custo) || 0) || Math.round((vUnit * 0.70) * 100) / 100;
                    const marcaItem = String(prodCad?.marca || 'DIVERSOS').trim().substring(0, 255);
                    const catItem = String(prodCad?.categoria || 'GERAL').trim().substring(0, 255);
                    const nomeItem = String(it.descricao || it.xProd || prodCad?.nome || `Produto ${prodId || ''}`).trim().substring(0, 500);
                    const itemCfop = cleanDigits(it.cfop || cfopStr).substring(0, 4) || cfopStr;

                    return {
                        prodId,
                        qtd,
                        vUnit,
                        vGross,
                        vNetRaw,
                        custoUnit,
                        marcaItem,
                        catItem,
                        nomeItem,
                        itemCfop
                    };
                });

                const sumNetRaw = itemDrafts.reduce((acc, d) => acc + d.vNetRaw, 0);
                let allocatedSum = 0;

                itemDrafts.forEach((d, idx) => {
                    let itemValFinal = 0;
                    if (idx === itemDrafts.length - 1) {
                        itemValFinal = Math.max(0, Math.round((absTotal - allocatedSum) * 100) / 100);
                    } else if (sumNetRaw > 0) {
                        itemValFinal = Math.round((absTotal * (d.vNetRaw / sumNetRaw)) * 100) / 100;
                        allocatedSum = Math.round((allocatedSum + itemValFinal) * 100) / 100;
                    } else {
                        itemValFinal = Math.round((absTotal / itemDrafts.length) * 100) / 100;
                        allocatedSum = Math.round((allocatedSum + itemValFinal) * 100) / 100;
                    }

                    const precoUnitLiq = d.qtd > 0 ? Math.round((itemValFinal / d.qtd) * 10000) / 10000 : d.vUnit;
                    notaCustoTotal += d.custoUnit * d.qtd;
                    if (!notaMarcaPrincipal && d.marcaItem) notaMarcaPrincipal = d.marcaItem;
                    if (!notaCategoriaPrincipal && d.catItem) notaCategoriaPrincipal = d.catItem;

                    itensRowsToInsert.push({
                        venda_id_firebird: vendaIdFirebird,
                        produto_id_firebird: d.prodId,
                        quantidade: d.qtd,
                        preco_unitario: precoUnitLiq,
                        custo_unitario: d.custoUnit,
                        valor_total: itemValFinal,
                        desconto_item: 0,
                        vendedor: vendedorNome,
                        produto: d.nomeItem,
                        marca: d.marcaItem,
                        categoria: d.catItem,
                        depto_id: deptoId,
                        cfop: d.itemCfop,
                        numero_nota: numeroNotaInt ? String(numeroNotaInt) : null,
                        chave_nfe: chaveTrim || null
                    });
                });
            } else {
                const custoEst = Math.round((absTotal * 0.70) * 100) / 100;
                notaCustoTotal = custoEst;
                notaMarcaPrincipal = 'DIVERSOS';
                notaCategoriaPrincipal = 'GERAL';
                itensRowsToInsert.push({
                    venda_id_firebird: vendaIdFirebird,
                    produto_id_firebird: null,
                    quantidade: 1,
                    preco_unitario: absTotal,
                    custo_unitario: custoEst,
                    valor_total: absTotal,
                    desconto_item: 0,
                    vendedor: vendedorNome,
                    produto: String(cg.produto_predominante || 'MERCADORIA FISCAL').trim().substring(0, 500),
                    marca: 'DIVERSOS',
                    categoria: 'GERAL',
                    depto_id: deptoId,
                    cfop: cfopStr,
                    numero_nota: numeroNotaInt ? String(numeroNotaInt) : null,
                    chave_nfe: chaveTrim || null
                });
            }

            const signedCusto = Math.round(sign * notaCustoTotal * 100) / 100;

            vendasRowsToInsert.push({
                id_firebird: vendaIdFirebird,
                numero_pedido: numeroPedidoStr,
                data_venda: cg.data_emissao,
                data_vencimento: cg.data_emissao,
                data_hora_proc: cg.data_emissao,
                cliente_id_firebird: clienteId,
                vendedor_id_firebird: vendedorId,
                valor_total: signedTotal,
                valor_custo: signedCusto,
                valor_desconto: 0,
                status: 'FATURADO',
                marca: notaMarcaPrincipal,
                categoria: notaCategoriaPrincipal,
                especie: especie ? String(especie).substring(0, 255) : 'NF-E FISCAL',
                depto_id: deptoId,
                cfop: cfopInt,
                numero_nota: numeroNotaInt,
                chave_nfe: chaveTrim ? chaveTrim.substring(0, 44) : null,
                es: isReturn ? 2 : 1,
                processo: 9,
                natureza_operacao: natOpStr
            });
        }

        await client.query('BEGIN');

        let nextItemId = -1;
        if (chavesFilter) {
            const targetVendaIds = vendasRowsToInsert.map(v => v.id_firebird);
            if (targetVendaIds.length > 0) {
                await client.query(
                    `DELETE FROM dash_vendas_itens WHERE tenant_id = $1 AND venda_id_firebird = ANY($2::int[])`,
                    [tenantId, targetVendaIds]
                );
                await client.query(
                    `DELETE FROM dash_vendas WHERE tenant_id = $1 AND id_firebird = ANY($2::int[]) AND processo = 9`,
                    [tenantId, targetVendaIds]
                );
            }
            const minRes = await client.query(
                `SELECT COALESCE(MIN(id_firebird), 0) AS min_id FROM dash_vendas_itens WHERE tenant_id = $1 AND id_firebird < 0`,
                [tenantId]
            );
            nextItemId = (parseInt(minRes.rows[0]?.min_id, 10) || 0) - 1;
        } else {
            await client.query(
                `DELETE FROM dash_vendas_itens WHERE tenant_id = $1 AND (id_firebird < 0 OR venda_id_firebird < 0)`,
                [tenantId]
            );
            await client.query(
                `DELETE FROM dash_vendas WHERE tenant_id = $1 AND (processo = 9 OR id_firebird < 0)`,
                [tenantId]
            );
            nextItemId = -1;
        }

        // Batch insert em dash_vendas (chunks de 500)
        const VENDA_COLS = [
            'tenant_id', 'id_firebird', 'numero_pedido', 'data_venda', 'data_vencimento', 'data_hora_proc',
            'cliente_id_firebird', 'vendedor_id_firebird', 'valor_total', 'valor_custo', 'valor_desconto',
            'status', 'marca', 'categoria', 'especie', 'depto_id', 'cfop', 'numero_nota', 'chave_nfe',
            'es', 'processo', 'natureza_operacao'
        ];

        const CHUNK_SIZE = 500;
        for (let i = 0; i < vendasRowsToInsert.length; i += CHUNK_SIZE) {
            const chunk = vendasRowsToInsert.slice(i, i + CHUNK_SIZE);
            const values = [];
            const placeholders = [];
            let pIdx = 1;
            for (const row of chunk) {
                placeholders.push(
                    `($${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, NOW())`
                );
                values.push(
                    tenantId, row.id_firebird, row.numero_pedido, row.data_venda, row.data_vencimento, row.data_hora_proc,
                    row.cliente_id_firebird, row.vendedor_id_firebird, row.valor_total, row.valor_custo, row.valor_desconto,
                    row.status, row.marca, row.categoria, row.especie, row.depto_id, row.cfop, row.numero_nota, row.chave_nfe,
                    row.es, row.processo, row.natureza_operacao
                );
            }
            await client.query(
                `INSERT INTO dash_vendas (${VENDA_COLS.join(', ')}, sincronizado_em)
                 VALUES ${placeholders.join(', ')}
                 ON CONFLICT (tenant_id, id_firebird) DO UPDATE SET
                    valor_total = EXCLUDED.valor_total,
                    valor_custo = EXCLUDED.valor_custo,
                    cliente_id_firebird = EXCLUDED.cliente_id_firebird,
                    vendedor_id_firebird = EXCLUDED.vendedor_id_firebird,
                    cfop = EXCLUDED.cfop,
                    depto_id = EXCLUDED.depto_id,
                    processo = 9,
                    sincronizado_em = NOW()`,
                values
            );
        }

        // Batch insert em dash_vendas_itens (chunks de 500)
        const ITEM_COLS = [
            'tenant_id', 'id_firebird', 'venda_id_firebird', 'produto_id_firebird', 'quantidade',
            'preco_unitario', 'custo_unitario', 'valor_total', 'desconto_item', 'vendedor',
            'produto', 'marca', 'categoria', 'depto_id', 'cfop', 'numero_nota', 'chave_nfe'
        ];

        for (let i = 0; i < itensRowsToInsert.length; i += CHUNK_SIZE) {
            const chunk = itensRowsToInsert.slice(i, i + CHUNK_SIZE);
            const values = [];
            const placeholders = [];
            let pIdx = 1;
            for (const row of chunk) {
                const itemFbId = nextItemId--;
                placeholders.push(
                    `($${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, NOW())`
                );
                values.push(
                    tenantId, itemFbId, row.venda_id_firebird, row.produto_id_firebird, row.quantidade,
                    row.preco_unitario, row.custo_unitario, row.valor_total, row.desconto_item, row.vendedor,
                    row.produto, row.marca, row.categoria, row.depto_id, row.cfop, row.numero_nota, row.chave_nfe
                );
            }
            await client.query(
                `INSERT INTO dash_vendas_itens (${ITEM_COLS.join(', ')}, sincronizado_em)
                 VALUES ${placeholders.join(', ')}
                 ON CONFLICT (tenant_id, id_firebird) DO NOTHING`,
                values
            );
        }

        await client.query('COMMIT');
        await client.query('ANALYZE dash_vendas; ANALYZE dash_vendas_itens;').catch(() => {});

        logger.info('[FiscalVendasSync] Sincronização fiscal concluída', {
            tenantId,
            syncedNotes: vendasRowsToInsert.length,
            syncedItems: itensRowsToInsert.length,
            elapsedMs: Date.now() - startTime
        });

        return {
            syncedNotes: vendasRowsToInsert.length,
            syncedItems: itensRowsToInsert.length,
            elapsedMs: Date.now() - startTime
        };
    } catch (err) {
        await client.query('ROLLBACK').catch(() => {});
        logger.error('[FiscalVendasSync] Erro ao materializar cargas fiscais em dash_vendas', {
            tenantId,
            error: err.message
        });
        throw err;
    } finally {
        client.release();
    }
}

module.exports = {
    syncFiscalCargasToVendas
};

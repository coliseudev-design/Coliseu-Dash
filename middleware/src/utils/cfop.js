'use strict';

const db = require('../db/postgres');

// CFOPs válidos de venda (com nota fiscal emitida)
const SALES_CFOPS = [
    5101, 5102, 5103, 5104, 5105, 5106, 5109, 5110, 5111, 5112, 5113, 5114, 5115, 5116, 5118, 5119, 5120, 5122, 5123,
    5251, 5252, 5253, 5254, 5255, 5256, 5257, 5258,
    5401, 5402, 5403, 5405,
    6101, 6102, 6103, 6104, 6105, 6106, 6107, 6108, 6109, 6110, 6111, 6112, 6113, 6114, 6115, 6116, 6118, 6119, 6120, 6122, 6123,
    6251, 6252, 6253, 6254, 6255, 6256, 6257, 6258,
    6401, 6402, 6403, 6404
];

// CFOPs de devolução para desconto no faturamento líquido
const RETURN_CFOPS = [1201, 1202, 2201, 2202, 1411];

// CFOPs de transferência entre matriz e filiais (nunca compõem faturamento comercial)
const TRANSFER_CFOPS = [
    5151, 5152, 5155, 5156,
    6151, 6152, 6155, 6156,
    1151, 1152, 1155, 1156,
    2151, 2152, 2155, 2156
];

// Status excluídos do faturamento
const SALES_STATUS_EXCLUDE = [
    'CANCELADO', 'ABERTO', 'PENDENTE', 'ORÇAMENTO', 'ORCAMENTO', 'NULO', 'TESTE'
];

/**
 * STRICT_SALES_FILTER (CFOP): sem filtro de CFOP para Sistema Coliseu.
 */
function getCfopFilterClause(tableAlias = 'v') {
    return '';
}

/**
 * Indica se o parâmetro global "Visualizar somente vendas com Nota Fiscal vinculada"
 * está ativo para a requisição atual.
 */
function isOnlyNfSalesActive() {
    const store = db.dbContext.getStore();
    return Boolean(store && store.onlyNfSales === true);
}

/**
 * Cláusula adicional quando o tenant ativou "Somente vendas com Nota Fiscal vinculada".
 * Exige que a venda possua NF-e / NFC-e autorizada vinculada na própria venda (sem subqueries lentas em dash_cargas).
 */
function getNfFilterClause(tableAlias = 'v') {
    if (!isOnlyNfSalesActive()) {
        return '';
    }
    const prefix = (tableAlias !== undefined && tableAlias !== null && tableAlias !== '') ? `${tableAlias}.` : '';
    const store = db.dbContext.getStore();
    const hasChaveNfe = store ? store.hasChaveNfe !== false : true;

    if (hasChaveNfe) {
        return `AND (${prefix}chave_nfe IS NOT NULL AND LENGTH(TRIM(${prefix}chave_nfe)) >= 40)`;
    }
    return `AND (
        (${prefix}numero_nota IS NOT NULL AND ${prefix}numero_nota > 0)
        OR (${prefix}chave_nfe IS NOT NULL AND TRIM(${prefix}chave_nfe) <> '')
    )`;
}

/**
 * Cláusula de filtro de NF para queries sobre `dash_devolucoes` vinculadas a `dash_vendas`.
 */
function getDevolucaoNfFilterClause(vendaAlias = 'v2', devAlias = 'd') {
    if (!isOnlyNfSalesActive()) {
        return '';
    }
    const store = db.dbContext.getStore();
    const hasChaveNfe = store ? store.hasChaveNfe !== false : true;

    if (hasChaveNfe) {
        return ` AND (${devAlias}.venda_id_firebird IS NULL OR (${vendaAlias}.chave_nfe IS NOT NULL AND LENGTH(TRIM(${vendaAlias}.chave_nfe)) >= 40))`;
    }
    return ` AND (${devAlias}.venda_id_firebird IS NULL OR (
        (${vendaAlias}.numero_nota IS NOT NULL AND ${vendaAlias}.numero_nota > 0)
        OR (${vendaAlias}.chave_nfe IS NOT NULL AND TRIM(${vendaAlias}.chave_nfe) <> '')
    ))`;
}

/**
 * STATUS_FILTER para Sistema Coliseu — alinhado ao ERP Gerência Geral.
 *
 * REGRAS VALIDADAS DE NEGÓCIO DO ERP COLISEU:
 * 1. Apenas vendas em status comercial efetivo ('FATURADO', 'FINALIZADO', 'PROCESSADO').
 * 2. Exclui transferências entre filiais (status, espécie, natureza_operacao ou CFOP de transferência).
 * 3. Exclui espécies 'SEM PAGAMENTO' (remessas/complementos fiscais sem valor comercial),
 *    exceto quando vinculadas a itens reais faturados a clientes finais.
 * 4. Exclui registros/pedidos sem itens de estoque (lançamentos financeiros/fantasmas ou cancelados na origem sem itens),
 *    mantendo compatibilidade com vendas recentes do mês corrente ainda em fila de sincronização.
 */
function getStatusFilterClause(tableAlias = 'v') {
    const prefix = (tableAlias !== undefined && tableAlias !== null && tableAlias !== '') ? `${tableAlias}.` : '';
    const tableRef = prefix || 'dash_vendas.';
    const nfClause = getNfFilterClause(tableAlias);
    return `AND TRIM(${prefix}status) IN ('FATURADO', 'FINALIZADO', 'PROCESSADO')
      AND ${prefix}status NOT ILIKE '%TRANSF%'
      AND (${prefix}especie IS NULL OR ${prefix}especie NOT ILIKE '%TRANSF%')
      AND (${prefix}natureza_operacao IS NULL OR (${prefix}natureza_operacao NOT ILIKE '%TRANSF%' AND ${prefix}natureza_operacao NOT ILIKE '%SIMPLES REMESSA%'))
      AND (${prefix}cfop IS NULL OR ${prefix}cfop NOT IN (${TRANSFER_CFOPS.join(', ')}))
      AND (${prefix}especie IS NULL OR ${prefix}especie NOT ILIKE '%SEM PAGAMENTO%' OR EXISTS (
        SELECT 1 FROM dash_vendas_itens vi WHERE vi.venda_id_firebird = ${tableRef}id_firebird AND vi.tenant_id = ${tableRef}tenant_id
      ))
      AND (
        (${prefix}numero_nota IS NOT NULL AND ${prefix}numero_nota > 0)
        OR (${prefix}chave_nfe IS NOT NULL AND TRIM(${prefix}chave_nfe) <> '')
        OR EXISTS (
          SELECT 1 FROM dash_vendas_itens vi WHERE vi.venda_id_firebird = ${tableRef}id_firebird AND vi.tenant_id = ${tableRef}tenant_id
        )
        OR ${prefix}data_venda >= (CURRENT_DATE - INTERVAL '30 days')
      ) ${nfClause}`;
}

/**
 * STRICT_SALES_FILTER completo.
 * Use este em todas as queries de faturamento e ranking.
 */
function getSalesFilterClause(tableAlias = 'v') {
    return `${getCfopFilterClause(tableAlias)} ${getStatusFilterClause(tableAlias)}`;
}

/**
 * Expressão SQL para faturamento líquido por pedido.
 * valor_total = bruto (itens do estoque)
 * valor_desconto = desconto comercial em R$
 * Líquido = valor_total - valor_desconto
 */
function getFaturamentoExpr(tableAlias = 'v') {
    const prefix = tableAlias ? `${tableAlias}.` : '';
    return `(${prefix}valor_total - COALESCE(${prefix}valor_desconto, 0))`;
}

/**
 * Campo de data canônico para agrupamento de faturamento.
 * data_hora_proc = DATA_VENCIMENTO do Firebird = data real de faturamento.
 */
function getDateField(tableAlias = 'v') {
    const prefix = tableAlias ? `${tableAlias}.` : '';
    return `${prefix}data_hora_proc`;
}

module.exports = {
    SALES_CFOPS,
    RETURN_CFOPS,
    TRANSFER_CFOPS,
    SALES_STATUS_EXCLUDE,
    isOnlyNfSalesActive,
    getNfFilterClause,
    getDevolucaoNfFilterClause,
    getCfopFilterClause,
    getStatusFilterClause,
    getSalesFilterClause,
    getFaturamentoExpr,
    getDateField,
};

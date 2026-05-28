'use strict';

const db = require('../db/postgres');

const SALES_CFOPS = [
    5101, 5102, 5103, 5104, 5105, 5106, 5109, 5110, 5111, 5112, 5113, 5114, 5115, 5116, 5118, 5119, 5120, 5122, 5123,
    5251, 5252, 5253, 5254, 5255, 5256, 5257, 5258,
    5401, 5402, 5403, 5405,
    6101, 6102, 6103, 6104, 6105, 6106, 6107, 6108, 6109, 6110, 6111, 6112, 6113, 6114, 6115, 6116, 6118, 6119, 6120, 6122, 6123,
    6251, 6252, 6253, 6254, 6255, 6256, 6257, 6258,
    6401, 6402, 6403, 6404
];

const SALES_STATUS_EXCLUDE = [
    'CANCELADO', 'ABERTO', 'PENDENTE', 'ORÇAMENTO', 'ORCAMENTO', 'NULO', 'TESTE'
];

function isVetContext() {
    const store = db.dbContext.getStore();
    return store && store.dbType === 'vet';
}

function getCfopFilterClause(tableAlias = 'v') {
    if (isVetContext()) {
        return `AND ${tableAlias}.cfop IN (${SALES_CFOPS.join(',')})`;
    }
    return '';
}

function getStatusFilterClause(tableAlias = 'v') {
    if (isVetContext()) {
        return `AND UPPER(TRIM(${tableAlias}.status)) NOT IN (${SALES_STATUS_EXCLUDE.map(s => `'${s}'`).join(',')})`;
    }
    return `AND TRIM(${tableAlias}.status) IN ('FATURADO', 'FINALIZADO')`;
}

function getSalesFilterClause(tableAlias = 'v') {
    return `${getCfopFilterClause(tableAlias)} ${getStatusFilterClause(tableAlias)}`;
}

module.exports = {
    SALES_CFOPS,
    SALES_STATUS_EXCLUDE,
    isVetContext,
    getCfopFilterClause,
    getStatusFilterClause,
    getSalesFilterClause
};

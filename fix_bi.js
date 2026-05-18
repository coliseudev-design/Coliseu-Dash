const fs = require('fs');

let content = fs.readFileSync('middleware/src/routes/bi.js', 'utf8');

// Replace the executive-summary query to subtract devolucoes
// We don't want to break the SQL, so we will just run a separate query for devolucoes and subtract it in JS.
const devolucoesQuery = `
        const { rows: dev_rows } = await db.query(\`
            SELECT COALESCE(SUM(d.valor), 0) AS devolucao_total
            FROM dash_devolucoes d
            LEFT JOIN dash_vendas v ON v.id_firebird = d.venda_id_firebird AND v.tenant_id = d.tenant_id
            WHERE d.tenant_id = \\$1 AND d.data_devolucao >= \\$2 AND d.data_devolucao <= \\$3
            \${df.clause}
        \`, [tenantId, toSafeSqlString(start), toSafeSqlString(end), ...df.params]);
        const devolucoes = parseFloat(dev_rows[0].devolucao_total);

        const { rows: dev_prev_rows } = await db.query(\`
            SELECT COALESCE(SUM(d.valor), 0) AS devolucao_total
            FROM dash_devolucoes d
            LEFT JOIN dash_vendas v ON v.id_firebird = d.venda_id_firebird AND v.tenant_id = d.tenant_id
            WHERE d.tenant_id = \\$1 AND d.data_devolucao >= \\$2 AND d.data_devolucao <= \\$3
            \${df.clause}
        \`, [tenantId, toSafeSqlString(prevStart), toSafeSqlString(prevEnd), ...df.params]);
        const devolucoes_anterior = parseFloat(dev_prev_rows[0].devolucao_total);
`;

const replaceTarget = `const faturamento = parseFloat(v[0].faturamento_total);
        const faturamento_anterior = parseFloat(vPrev[0].faturamento_total);`;

const replaceWith = `
${devolucoesQuery}
        const faturamento = parseFloat(v[0].faturamento_total) - devolucoes;
        const faturamento_anterior = parseFloat(vPrev[0].faturamento_total) - devolucoes_anterior;
`;

if (content.includes(replaceTarget)) {
    content = content.replace(replaceTarget, replaceWith);
    fs.writeFileSync('middleware/src/routes/bi.js', content, 'utf8');
    console.log("bi.js updated with devolucoes subtraction!");
} else {
    console.log("Target not found in bi.js");
}

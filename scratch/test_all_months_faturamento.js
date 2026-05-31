const db = require('./src/db/postgres');

function getSalesByMonth(tenantId) {
    return new Promise((resolve) => {
        db.dbContext.run({ dbType: 'main' }, async () => {
            console.log(`=== Sales by Month for Tenant: ${tenantId} ===`);
            try {
                const res = await db.query(`
                    SELECT 
                        TO_CHAR(data_venda, 'YYYY-MM') as mes,
                        COUNT(*) as count,
                        SUM(valor_total) as total
                    FROM dash_vendas
                    WHERE tenant_id = $1
                      AND TRIM(status) IN ('FATURADO', 'FINALIZADO')
                    GROUP BY TO_CHAR(data_venda, 'YYYY-MM')
                    ORDER BY mes DESC
                `, [tenantId]);
                console.log(res.rows);
            } catch(e) {
                console.error(e.message);
            }
            resolve();
        });
    });
}

async function main() {
    await getSalesByMonth('a822a7e7-fdd4-4483-bbb5-26587a72739f');
    await getSalesByMonth('ed1d3a98-4c4d-48db-99c0-8751926eb8e5');
    process.exit(0);
}

main();

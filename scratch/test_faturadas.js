const db = require('./src/db/postgres');

async function test() {
    const tenantId = 'a822a7e7-fdd4-4483-bbb5-26587a72739f';
    const start_date = '2025-12-01';
    const end_date = '2025-12-31';
    
    db.dbContext.run({ dbType: 'main' }, async () => {
        try {
            // Count total sales in Dec 2025
            const total = await db.query(
                "SELECT COUNT(*) FROM dash_vendas WHERE tenant_id = $1 AND data_venda >= $2 AND data_venda <= $3 AND TRIM(status) IN ('FATURADO', 'FINALIZADO')",
                [tenantId, start_date + ' 00:00:00', end_date + ' 23:59:59']
            );
            console.log('Faturadas sales in Dec 2025:', total.rows[0].count);
        } catch(e) {
            console.error('ERROR:', e.message);
        }
        process.exit(0);
    });
}

test();

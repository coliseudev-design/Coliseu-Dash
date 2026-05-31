const db = require('./src/db/postgres');

async function test() {
    const tenantId = 'a822a7e7-fdd4-4483-bbb5-26587a72739f';
    db.dbContext.run({ dbType: 'main' }, async () => {
        try {
            console.log('=== Checking Sales in May 2026 ===');
            const res = await db.query(
                "SELECT status, COUNT(*), SUM(valor_total) FROM dash_vendas WHERE tenant_id = $1 AND data_venda >= '2026-05-01 00:00:00' AND data_venda <= '2026-05-31 23:59:59' GROUP BY status",
                [tenantId]
            );
            console.log(res.rows);

            console.log('=== Checking Sales in December 2023 ===');
            const res2 = await db.query(
                "SELECT status, COUNT(*), SUM(valor_total) FROM dash_vendas WHERE tenant_id = $1 AND data_venda >= '2023-12-01 00:00:00' AND data_venda <= '2023-12-31 23:59:59' GROUP BY status",
                [tenantId]
            );
            console.log(res2.rows);
            
            console.log('=== Checking Sales in January 2024 ===');
            const res3 = await db.query(
                "SELECT status, COUNT(*), SUM(valor_total) FROM dash_vendas WHERE tenant_id = $1 AND data_venda >= '2024-01-01 00:00:00' AND data_venda <= '2024-01-31 23:59:59' GROUP BY status",
                [tenantId]
            );
            console.log(res3.rows);

        } catch(e) {
            console.error('ERROR:', e.message);
        }
        process.exit(0);
    });
}

test();

const db = require('./src/db/postgres');

async function test() {
    const tenantId = 'a822a7e7-fdd4-4483-bbb5-26587a72739f';
    db.dbContext.run({ dbType: 'main' }, async () => {
        try {
            console.log('=== Checking Clientes for Tenant ===');
            const res = await db.query(
                "SELECT COUNT(*), COUNT(CASE WHEN ativo=true THEN 1 END) FROM dash_clientes WHERE tenant_id = $1",
                [tenantId]
            );
            console.log('Clients count:', res.rows[0]);
            
            // Also let's check one row from dash_clientes
            const sample = await db.query(
                "SELECT * FROM dash_clientes WHERE tenant_id = $1 LIMIT 1",
                [tenantId]
            );
            console.log('Sample client:', sample.rows[0]);
            
        } catch(e) {
            console.error('ERROR:', e.message);
        }
        process.exit(0);
    });
}

test();

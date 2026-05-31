const db = require('./src/db/postgres');

async function checkDb(dbType) {
    return new Promise((resolve) => {
        db.dbContext.run({ dbType }, async () => {
            console.log(`=== DB: ${dbType} ===`);
            try {
                // List database name
                const dbName = await db.query("SELECT current_database()");
                console.log("Database:", dbName.rows[0].current_database);

                // Group by tenant_id
                const tenants = await db.query(
                    "SELECT tenant_id, COUNT(*) as cnt, SUM(valor_total) as total_sales FROM dash_vendas GROUP BY tenant_id"
                );
                console.log("Tenants in dash_vendas:", tenants.rows);

                // Users
                const users = await db.query(
                    "SELECT id, email, tenant_id, use_vet_db, layout_version FROM dash_usuarios"
                );
                console.log("Users:", users.rows);
            } catch(e) {
                console.error("ERROR:", e.message);
            }
            resolve();
        });
    });
}

async function main() {
    await checkDb('main');
    await checkDb('vet');
    process.exit(0);
}

main();

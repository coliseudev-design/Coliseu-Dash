const { poolMain, poolVet } = require('./src/db/postgres');

(async () => {
    try {
        console.log("=== MAIN DB (coliseu_dashboard) ===");
        const mainTenants = await poolMain.query('SELECT DISTINCT tenant_id FROM dash_usuarios');
        for (const r of mainTenants.rows) {
            const tenantId = r.tenant_id;
            const userCount = (await poolMain.query('SELECT COUNT(*) FROM dash_usuarios WHERE tenant_id = $1', [tenantId])).rows[0].count;
            const salesCount = (await poolMain.query('SELECT COUNT(*) FROM dash_vendas WHERE tenant_id = $1', [tenantId])).rows[0].count;
            console.log(`Tenant ${tenantId}: Users=${userCount}, Vendas=${salesCount}`);
        }
        
        console.log("\n=== VET DB (coliseu_dashboard_vet) ===");
        const vetTenants = await poolVet.query('SELECT DISTINCT tenant_id FROM dash_usuarios');
        for (const r of vetTenants.rows) {
            const tenantId = r.tenant_id;
            const userCount = (await poolVet.query('SELECT COUNT(*) FROM dash_usuarios WHERE tenant_id = $1', [tenantId])).rows[0].count;
            const salesCount = (await poolVet.query('SELECT COUNT(*) FROM dash_vendas WHERE tenant_id = $1', [tenantId])).rows[0].count;
            console.log(`Tenant ${tenantId}: Users=${userCount}, Vendas=${salesCount}`);
        }
    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
})();

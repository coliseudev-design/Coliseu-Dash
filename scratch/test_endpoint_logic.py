import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('177.39.17.7', username='root', password='6EFBC!c0:wzr%Ij')

MW_CONTAINER = 'dashboard-middleware-irerzifjwjb4q8ucbpfk2gb8-145439028228'

node_script = """
const db = require('./src/db/postgres');
const { getPeriodRange } = require('./src/utils/period');
const cfopUtil = require('./src/utils/cfop');
const { buildDeptoFilter, buildVendedorFilter } = require('./src/routes/filiais');

async function testTenant(tenantId, label) {
    // We mock bindDbContext by running in the async context
    await db.dbContext.run({ dbType: 'main', isVet: false }, async () => {
        try {
            console.log(`\\n=== TESTING FOR ${label} (${tenantId}) ===`);
            const period = 'last12m';
            
            // Get anchor date (as in stats route)
            let anchorDate = new Date();
            // Since isVetContext is false, anchorDate remains new Date()
            
            const { start, end } = getPeriodRange(period, null, null, anchorDate);
            console.log('Range:', { start, end });
            
            const startHoje = new Date(anchorDate);
            startHoje.setHours(0, 0, 0, 0);
            const startHojeStr = require('./src/utils/period').toSafeSqlString(startHoje);
            const endHoje = new Date(anchorDate);
            endHoje.setHours(23, 59, 59, 999);
            const endHojeStr = require('./src/utils/period').toSafeSqlString(endHoje);

            const df = buildDeptoFilter(undefined, 4, 'v');
            const vf = buildVendedorFilter(undefined, 4 + df.params.length, 'v');
            
            const salesFilter = cfopUtil.getSalesFilterClause('v');
            
            // Let's run the main faturamento query
            const sql = `SELECT COALESCE(SUM(v.valor_total),0) AS total, COUNT(*) AS qtd FROM dash_vendas v WHERE v.tenant_id = $1 AND v.data_venda >= $2 AND v.data_venda <= $3 ${salesFilter} ${df.clause} ${vf.clause}`;
            const params = [tenantId, start, end, ...df.params, ...vf.params];
            
            const res = await db.query(sql, params);
            console.log(`vMes Result:`, res.rows[0]);
            
            // Let's also run query 5 (pedidos processados)
            const cfopFilter = cfopUtil.getCfopFilterClause('v');
            const procStatusFilter = cfopUtil.getStatusFilterClause('v');
            const sqlProc = `SELECT COUNT(*) AS qtd FROM dash_vendas v WHERE v.tenant_id = $1 AND v.data_venda >= $2 AND v.data_venda <= $3 ${cfopFilter} ${procStatusFilter} ${df.clause} ${vf.clause}`;
            const resProc = await db.query(sqlProc, [tenantId, start, end, ...df.params, ...vf.params]);
            console.log(`pedidos_processados:`, resProc.rows[0]);
        } catch(err) {
            console.error("Error:", err.message);
        }
    });
}

async function main() {
    await testTenant('a822a7e7-fdd4-4483-bbb5-26587a72739f', 'SILENUS / VET');
    await testTenant('ed1d3a98-4c4d-48db-99c0-8751926eb8e5', 'EMPRESA CLIENTE / TESTE PET');
    process.exit(0);
}
main();
"""

stdin, stdout, stderr = client.exec_command(f'docker exec -i {MW_CONTAINER} node')
stdin.write(node_script)
stdin.close()
print("=== STDOUT ===")
print(stdout.read().decode('utf-8'))
print("=== STDERR ===")
print(stderr.read().decode('utf-8'))

client.close()

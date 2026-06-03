import paramiko

HOST = '177.39.17.7'
USER = 'root'
PASS = '6EFBC!c0:wzr%Ij'
MW_CONTAINER = 'dashboard-middleware-irerzifjwjb4q8ucbpfk2gb8-134707159354'

node_test_script = """
const db = require('./src/db/postgres');
const { getPeriodRange } = require('./src/utils/period');
const cfopUtil = require('./src/utils/cfop');
const { buildDeptoFilter } = require('./src/routes/filiais');

const tenantId = 'a822a7e7-fdd4-4483-bbb5-26587a72739f';
const period = 'last12m';
const deptoId = 'todas';

db.dbContext.run({ dbType: 'main' }, async () => {
    try {
        console.log('isVetContext():', cfopUtil.isVetContext());
        const { rows: anchorRows } = await db.query(
            'SELECT MAX(data_venda) AS max_date FROM dash_vendas WHERE tenant_id = $1',
            [tenantId]
        );
        const anchorDate = anchorRows[0].max_date ? new Date(anchorRows[0].max_date) : new Date();
        console.log('Anchor Date:', anchorDate.toISOString());

        const { start, end } = getPeriodRange(period, null, null, anchorDate);
        console.log('Range:', { start, end });

        const startHoje = new Date(anchorDate);
        startHoje.setHours(0, 0, 0, 0);
        const startHojeStr = require('./src/utils/period').toSafeSqlString(startHoje);
        const endHoje = new Date(anchorDate);
        endHoje.setHours(23, 59, 59, 999);
        const endHojeStr = require('./src/utils/period').toSafeSqlString(endHoje);

        const df = buildDeptoFilter(deptoId, 4, 'v');
        console.log('Depto filter:', df);

        const salesFilter = cfopUtil.getSalesFilterClause('v');
        const cfopFilter = cfopUtil.getCfopFilterClause('v');

        console.log('salesFilter:', salesFilter);
        console.log('df.params:', df.params);

        // Run queries one by one to see where it breaks
        const runQueryWithCheck = async (name, sql, params) => {
            try {
                const res = await db.query(sql, params);
                console.log(`Query [${name}] SUCCESS. Rows: ${res.rowCount}`);
                if (res.rowCount > 0) {
                    console.log(`  Sample row: ${JSON.stringify(res.rows[0])}`);
                }
            } catch (err) {
                console.error(`Query [${name}] FAILED: ${err.message}`);
                console.error(`  SQL: ${sql}`);
                console.error(`  Params: ${JSON.stringify(params)}`);
            }
        };

        await runQueryWithCheck(
            'vHoje',
            `SELECT COALESCE(SUM(v.valor_total),0) AS total, COUNT(*) AS qtd FROM dash_vendas v WHERE v.tenant_id = $1 AND v.data_venda >= $2 AND v.data_venda <= $3 ${salesFilter} ${df.clause}`,
            [tenantId, startHojeStr, endHojeStr, ...df.params]
        );

        await runQueryWithCheck(
            'vMes',
            `SELECT COALESCE(SUM(v.valor_total),0) AS total, COUNT(*) AS qtd FROM dash_vendas v WHERE v.tenant_id = $1 AND v.data_venda >= $2 AND v.data_venda <= $3 ${salesFilter} ${df.clause}`,
            [tenantId, start, end, ...df.params]
        );

        await runQueryWithCheck(
            'pAbertos',
            `SELECT COUNT(*) AS qtd FROM dash_vendas v WHERE v.tenant_id = $1 AND v.data_venda >= $2 AND v.data_venda <= $3 AND UPPER(TRIM(v.status)) IN ('PENDENTE','ABERTO') ${cfopFilter} ${df.clause}`,
            [tenantId, start, end, ...df.params]
        );

        await runQueryWithCheck(
            'topMarcasVendas',
            `SELECT COALESCE(vi.marca, p.marca, 'S/ MARCA') AS marca, SUM(vi.valor_total) AS total FROM dash_vendas_itens vi JOIN dash_vendas v ON v.id_firebird = vi.venda_id_firebird AND v.tenant_id = vi.tenant_id LEFT JOIN dash_produtos p ON p.id_firebird = vi.produto_id_firebird AND p.tenant_id = vi.tenant_id WHERE vi.tenant_id = $1 AND v.data_venda >= $2 AND v.data_venda <= $3 ${salesFilter} AND COALESCE(vi.marca, p.marca) IS NOT NULL AND COALESCE(vi.marca, p.marca) != '' ${df.clause} GROUP BY COALESCE(vi.marca, p.marca) ORDER BY total DESC LIMIT 15`,
            [tenantId, start, end, ...df.params]
        );

    } catch (e) {
        console.error('GLOBAL ERR:', e.message);
    }
    process.exit(0);
});
"""

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
try:
    client.connect(HOST, username=USER, password=PASS)
    # Using -i for interactive mode so it takes stdin
    stdin, stdout, stderr = client.exec_command(f'docker exec -i {MW_CONTAINER} node')
    stdin.write(node_test_script)
    stdin.close()
    print("=== stdout ===")
    print(stdout.read().decode('utf-8'))
    print("=== stderr ===")
    print(stderr.read().decode('utf-8'))
except Exception as e:
    print("ERR:", e)
finally:
    client.close()

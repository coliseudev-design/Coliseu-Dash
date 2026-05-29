import paramiko

HOST = '177.39.17.7'
USER = 'root'
PASS = '6EFBC!c0:wzr%Ij'
MW_CONTAINER = 'dashboard-middleware-irerzifjwjb4q8ucbpfk2gb8-144356492056'

node_test_script = """
const db = require('./src/db/postgres');
const { getPeriodRange } = require('./src/utils/period');
const cfopUtil = require('./src/utils/cfop');
const { buildDeptoFilter } = require('./src/routes/filiais');

const tenantId = 'a822a7e7-fdd4-4483-bbb5-26587a72739f';
const period = 'thisMonth';
const deptoId = '4';

db.dbContext.run({ dbType: 'vet' }, async () => {
    try {
        const { rows: anchorRows } = await db.query(
            'SELECT MAX(data_venda) AS max_date FROM dash_vendas WHERE tenant_id = $1',
            [tenantId]
        );
        const anchorDate = anchorRows[0].max_date ? new Date(anchorRows[0].max_date) : new Date();
        const { start, end } = getPeriodRange(period, null, null, anchorDate);

        const df = buildDeptoFilter(deptoId, 4, 'v');
        const dfFin = buildDeptoFilter(deptoId, 4, 'f');
        const dfVi = buildDeptoFilter(deptoId, 4, 'vi');

        const salesFilter = cfopUtil.getSalesFilterClause('v');

        const runQueryWithCheck = async (name, sql, params) => {
            try {
                const res = await db.query(sql, params);
                console.log(`Query [${name}] SUCCESS. Rows: ${res.rowCount}`);
            } catch (err) {
                console.error(`Query [${name}] FAILED: ${err.message}`);
                console.error(`  SQL: ${sql}`);
            }
        };

        // Test topCats query in kpis
        await runQueryWithCheck(
            'topCats (kpis)',
            `SELECT COALESCE(vi.categoria, p.categoria, 'S/ GRUPO') as categoria, SUM(vi.valor_total) AS total
            FROM dash_vendas_itens vi
            JOIN dash_vendas v ON v.id_firebird = vi.venda_id_firebird AND v.tenant_id = vi.tenant_id
            LEFT JOIN dash_produtos p ON p.id_firebird = vi.produto_id_firebird AND p.tenant_id = vi.tenant_id
            WHERE vi.tenant_id = $1 AND v.data_venda >= $2 AND v.data_venda <= $3 ${salesFilter}
              AND COALESCE(vi.categoria, p.categoria) IS NOT NULL AND COALESCE(vi.categoria, p.categoria) != '' ${dfVi.clause}
            GROUP BY COALESCE(vi.categoria, p.categoria) ORDER BY total DESC LIMIT 5`,
            [tenantId, start, end, ...dfVi.params]
        );

        // Test topProd query in kpis
        await runQueryWithCheck(
            'topProd (kpis)',
            `SELECT COALESCE(vi.produto, p.nome, 'Sem nome') AS nome, SUM(vi.quantidade) AS qtd
            FROM dash_vendas_itens vi
            JOIN dash_vendas v ON v.id_firebird = vi.venda_id_firebird AND v.tenant_id = vi.tenant_id
            LEFT JOIN dash_produtos p ON p.id_firebird = vi.produto_id_firebird AND p.tenant_id = vi.tenant_id
            WHERE vi.tenant_id = $1 AND v.data_venda >= $2 AND v.data_venda <= $3 ${salesFilter} ${dfVi.clause}
            GROUP BY COALESCE(vi.produto, p.nome)
            ORDER BY qtd DESC LIMIT 1`,
            [tenantId, start, end, ...dfVi.params]
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

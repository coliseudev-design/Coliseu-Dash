import paramiko

HOST = '177.39.17.7'
USER = 'root'
PASS = '6EFBC!c0:wzr%Ij'

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())

try:
    client.connect(HOST, username=USER, password=PASS)
    
    # 1. Discover middleware container name
    stdin, stdout, stderr = client.exec_command("docker ps --format '{{.Names}}' | grep 'dashboard-middleware'")
    MW = stdout.read().decode('utf-8').strip()
    print(f"Middleware container: {MW}")
    
    # 2. Node script to call statistics/overview and ranking queries
    node_script = """
const db = require('/usr/src/app/src/db/postgres');
const cfopUtil = require('/usr/src/app/src/utils/cfop');
const { getPeriodRange } = require('/usr/src/app/src/utils/period');

async function test() {
    await new Promise((resolve) => {
        db.dbContext.run({ dbType: 'vet' }, async () => {
            try {
                const tenantId = 'a822a7e7-fdd4-4483-bbb5-26587a72739f';
                const period = 'custom';
                const start_date = '2025-12-01';
                const end_date = '2025-12-31';

                const { rows: anchorRows } = await db.query(
                    'SELECT MAX(data_venda) AS max_date FROM dash_vendas WHERE tenant_id = $1',
                    [tenantId]
                );
                const anchorDate = anchorRows[0].max_date ? new Date(anchorRows[0].max_date) : new Date();
                const { start, end } = getPeriodRange(period, start_date, end_date, anchorDate);
                const salesFilter = cfopUtil.getSalesFilterClause('v');

                // Vendedores query
                const qVend = `
                    SELECT 
                        COALESCE(vd.nome, 'Vendedor ' || COALESCE(v.vendedor_id_firebird::text, '?')) AS nome,
                        SUM(v.valor_total) AS total
                    FROM dash_vendas v
                    LEFT JOIN dash_vendedores vd ON vd.id_firebird = v.vendedor_id_firebird AND vd.tenant_id = v.tenant_id
                    WHERE v.tenant_id = $1 AND v.data_venda >= $2 AND v.data_venda <= $3 ${salesFilter}
                    GROUP BY v.vendedor_id_firebird, vd.nome
                `;
                const resVend = await db.query(qVend, [tenantId, start, end]);
                console.log('Vendedores query result:', resVend.rows);
                resolve();
            } catch (err) {
                console.error('INNER ERROR:', err);
                resolve();
            }
        });
    });
    process.exit(0);
}

test();
"""
    # Write node script to a temp file inside container
    cmd_write = f"docker exec -i {MW} tee /tmp/test_overview.js"
    stdin_write, stdout_write, stderr_write = client.exec_command(cmd_write)
    stdin_write.write(node_script)
    stdin_write.close()
    stdout_write.read() # wait for write
    
    # Run the node script
    cmd_run = f"docker exec {MW} node /tmp/test_overview.js"
    stdin_run, stdout_run, stderr_run = client.exec_command(cmd_run)
    
    print("\n=== Execution Output ===")
    print(stdout_run.read().decode('utf-8'))
    print("STDERR:")
    print(stderr_run.read().decode('utf-8'))

except Exception as e:
    print(f"Error: {e}")
finally:
    client.close()

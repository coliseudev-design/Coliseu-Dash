import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('177.39.17.7', username='root', password='6EFBC!c0:wzr%Ij')

MIDDLEWARE_CONTAINER = "dashboard-middleware-irerzifjwjb4q8ucbpfk2gb8-145439028228"

js_code = """
const db = require('/usr/src/app/src/db/postgres');
const cfopUtil = require('/usr/src/app/src/utils/cfop');

async function run() {
    const tenantId = 'a822a7e7-fdd4-4483-bbb5-26587a72739f';
    const start = '2026-04-01 00:00:00';
    const end = '2026-04-30 23:59:59';
    const deptoId = undefined;
    const vendedorId = undefined;
    const cidade = undefined;
    const grupo = undefined;
    const marca = undefined;

    // Helper functions from filiais.js
    const { buildDeptoFilter, buildVendedorFilter, buildCidadeFilter, buildGrupoFilter, buildMarcaFilter } = require('/usr/src/app/src/routes/filiais');

    const df = buildDeptoFilter(deptoId, 4, 'v');
    let nextParamIndex = 4 + df.params.length;

    const vf = buildVendedorFilter(vendedorId, nextParamIndex, 'v');
    nextParamIndex += vf.params.length;

    const cf = buildCidadeFilter(cidade, nextParamIndex, 'c');
    nextParamIndex += cf.params.length;

    const gf = buildGrupoFilter(grupo, nextParamIndex, 'vi', 'p');
    nextParamIndex += gf.params.length;

    const mf = buildMarcaFilter(marca, nextParamIndex, 'vi', 'p');
    nextParamIndex += mf.params.length;

    const salesFilter = cfopUtil.getSalesFilterClause('v');

    const hasItemFilter = false;

    // Construir os parâmetros base para queries
    const baseParams = [tenantId, start, end, ...df.params, ...vf.params, ...cf.params];
    const allParams = [...baseParams];

    // Query 2: Pedidos e Faturamento Total (Bruto)
    const salesQuery = `
        SELECT 
            COUNT(DISTINCT v.id_firebird) as pedidos,
            COALESCE(SUM(v.valor_total), 0) as faturamento_total
        FROM dash_vendas v
        LEFT JOIN dash_clientes c ON c.id_firebird = v.cliente_id_firebird AND c.tenant_id = v.tenant_id
        WHERE v.tenant_id = $1 AND v.data_venda >= $2 AND v.data_venda <= $3 
          ${salesFilter}
          ${df.clause}
          ${vf.clause}
          ${cf.clause}
    `;

    try {
        console.log("Sales Filter Clause:", salesFilter);
        console.log("Params:", allParams);
        const { rows: pVendas } = await db.query(salesQuery, allParams);
        console.log("Result:", pVendas);
    } catch (e) {
        console.error("Error running query:", e);
    }
    process.exit(0);
}
run();
"""

# Open stdin and write via cat heredoc
stdin, stdout, stderr = client.exec_command(f"docker exec -i {MIDDLEWARE_CONTAINER} tee /tmp/test_kpi.js > /dev/null")
stdin.write(js_code)
stdin.close()
stdout.read() # wait for command to finish

# Execute file in container
cmd_run = f"docker exec {MIDDLEWARE_CONTAINER} node /tmp/test_kpi.js"
stdin, stdout, stderr = client.exec_command(cmd_run)
print("=== NODE OUTPUT ===")
print(stdout.read().decode('utf-8'))
err = stderr.read().decode('utf-8')
if err:
    print("=== NODE ERR ===")
    print(err)

client.close()

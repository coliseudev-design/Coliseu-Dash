import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('177.39.17.7', username='root', password='6EFBC!c0:wzr%Ij')

# Search for customer names in dash_clientes or dash_vendas
script = """
const db = require('./src/db/postgres');
const tenantId = '816f97c4-66fb-4ef8-905d-e0551cbf2492';

async function run() {
  try {
    // 1. Search for customer names in dash_clientes
    console.log('=== CLIENTES ===');
    const { rows: clientes } = await db.query(
      `SELECT id_firebird, nome FROM dash_clientes WHERE tenant_id = $1 AND (nome ILIKE '%PEDRO LUIZ%' OR nome ILIKE '%RICARDO OJEDA%' OR nome ILIKE '%CAROLINE AMORIM%')`,
      [tenantId]
    );
    console.log(clientes);

    // 2. Search for sales of these customer names or any sales on 2026-06-01
    console.log('\\n=== SALES ON 2026-06-01 ===');
    const { rows: sales_01 } = await db.query(
      `SELECT id_firebird, cliente_id_firebird, data_venda::text, valor_total, status, vendedor_id_firebird FROM dash_vendas WHERE tenant_id = $1 AND data_venda >= '2026-06-01 00:00:00' AND data_venda <= '2026-06-01 23:59:59'`,
      [tenantId]
    );
    console.log(sales_01);

    // 3. Search for any sales of a specific customer in dash_vendas
    console.log('\\n=== SALES FOR CUSTOMERS IN DB ===');
    const { rows: client_sales } = await db.query(
      `SELECT v.id_firebird, c.nome, v.data_venda::text, v.valor_total, v.status FROM dash_vendas v JOIN dash_clientes c ON c.id_firebird = v.cliente_id_firebird AND c.tenant_id = v.tenant_id WHERE v.tenant_id = $1 ORDER BY v.data_venda DESC LIMIT 20`,
      [tenantId]
    );
    console.log(client_sales);

  } catch (e) {
    console.error(e);
  } finally {
    db.end();
  }
}

run();
"""

stdin, stdout, stderr = client.exec_command("docker ps --format '{{.Names}}' | grep 'dashboard-middleware'")
MW = stdout.read().decode('utf-8').strip()

stdin, stdout, stderr = client.exec_command(f"docker exec -i {MW} node")
stdin.write(script)
stdin.close()

print("STDOUT:")
print(stdout.read().decode('utf-8'))
print("STDERR:")
print(stderr.read().decode('utf-8'))
client.close()

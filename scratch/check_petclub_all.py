import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('177.39.17.7', username='root', password='6EFBC!c0:wzr%Ij')

script = """
const db = require('./src/db/postgres');
const tenantId = '816f97c4-66fb-4ef8-905d-e0551cbf2492';

async function run() {
  try {
    console.log('=== VENDAS PETCLUB ===');
    const { rows: sales } = await db.query(
      `SELECT id, id_firebird, cliente_id_firebird, vendedor_id_firebird, data_venda::text, valor_total, status, cfop, numero_pedido FROM dash_vendas WHERE tenant_id = $1 ORDER BY data_venda`,
      [tenantId]
    );
    console.log(JSON.stringify(sales, null, 2));

    console.log('\\n=== VENDEDORES PETCLUB ===');
    const { rows: sellers } = await db.query(
      `SELECT id_firebird, nome FROM dash_vendedores WHERE tenant_id = $1`,
      [tenantId]
    );
    console.log(sellers);

    console.log('\\n=== CLIENTES PETCLUB ===');
    const { rows: clients } = await db.query(
      `SELECT id_firebird, nome FROM dash_clientes WHERE tenant_id = $1`,
      [tenantId]
    );
    console.log(clients);

    console.log('\\n=== ITEMS PETCLUB ===');
    const { rows: items } = await db.query(
      `SELECT id, venda_id_firebird, produto_id_firebird, quantidade, valor_total FROM dash_vendas_itens WHERE tenant_id = $1`,
      [tenantId]
    );
    console.log(items);

  } catch (e) {
    console.error(e);
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

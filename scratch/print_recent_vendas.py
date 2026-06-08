import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('177.39.17.7', username='root', password='6EFBC!c0:wzr%Ij')

script = """
const db = require('./src/db/postgres');

async function run() {
  try {
    console.log('=== ALL SALES IN DB ===');
    const { rows: sales } = await db.query(
      `SELECT id, tenant_id, id_firebird, cliente_id_firebird, vendedor_id_firebird, data_venda::text, valor_total, status, cfop, numero_pedido FROM dash_vendas`
    );
    console.log(sales);

    console.log('\\n=== ALL VENDEDORES IN DB ===');
    const { rows: sellers } = await db.query(
      `SELECT tenant_id, id_firebird, nome FROM dash_vendedores`
    );
    console.log(sellers);

    console.log('\\n=== ALL CLIENTES IN DB ===');
    const { rows: clients } = await db.query(
      `SELECT tenant_id, id_firebird, nome FROM dash_clientes`
    );
    console.log(clients);

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

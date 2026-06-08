import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('177.39.17.7', username='root', password='6EFBC!c0:wzr%Ij')

script = """
const db = require('./src/db/postgres');

async function run() {
  try {
    // 1. Search for customer name across all tenants
    console.log('=== CLIENTS SEARCH ===');
    const { rows: clients } = await db.query(
      `SELECT tenant_id, id_firebird, nome FROM dash_clientes WHERE nome ILIKE '%KLEBER CENTURION%'`
    );
    console.log(clients);

    // 2. Search for seller name across all tenants
    console.log('\\n=== SELLERS SEARCH ===');
    const { rows: sellers } = await db.query(
      `SELECT tenant_id, id_firebird, nome FROM dash_vendedores WHERE nome ILIKE '%ALICE DE MORAES%'`
    );
    console.log(sellers);

    // 3. Search for any sales with AO CONSUMIDOR in the last month
    console.log('\\n=== SALES SEARCH ===');
    const { rows: sales } = await db.query(
      `SELECT tenant_id, COUNT(*), MIN(data_venda)::text, MAX(data_venda)::text FROM dash_vendas GROUP BY tenant_id`
    );
    console.log(sales);

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

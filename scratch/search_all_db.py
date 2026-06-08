import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('177.39.17.7', username='root', password='6EFBC!c0:wzr%Ij')

script = """
const db = require('./src/db/postgres');

async function run() {
  try {
    // 1. Search for any seller named ALICE
    console.log('=== ALICE SELLERS ===');
    const { rows: sellers } = await db.query(
      `SELECT tenant_id, id_firebird, nome FROM dash_vendedores WHERE nome ILIKE '%ALICE%'`
    );
    console.log(sellers);

    // 2. Search for any client named KLEBER
    console.log('\\n=== KLEBER CLIENTS ===');
    const { rows: clients } = await db.query(
      `SELECT tenant_id, id_firebird, nome FROM dash_clientes WHERE nome ILIKE '%KLEBER%'`
    );
    console.log(clients);

    // 3. Count total sellers and clients per tenant
    console.log('\\n=== SELLERS PER TENANT ===');
    const { rows: sellers_cnt } = await db.query(
      `SELECT tenant_id, COUNT(*) FROM dash_vendedores GROUP BY tenant_id`
    );
    console.log(sellers_cnt);

    console.log('\\n=== CLIENTS PER TENANT ===');
    const { rows: clients_cnt } = await db.query(
      `SELECT tenant_id, COUNT(*) FROM dash_clientes GROUP BY tenant_id`
    );
    console.log(clients_cnt);

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

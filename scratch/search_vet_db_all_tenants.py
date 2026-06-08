import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('177.39.17.7', username='root', password='6EFBC!c0:wzr%Ij')

script = """
const { Pool } = require('pg');
const p = new Pool({
  host: process.env.PG_HOST || 'coliseu-db',
  user: process.env.PG_USER || 'coliseu_admin',
  password: process.env.PG_PASSWORD || 'ColiseuDB2026Prod',
  database: 'coliseu_dashboard_vet',
  port: 5432
});

async function run() {
  try {
    // 1. Group sales by tenant_id
    console.log('=== VENDAS POR TENANT IN VET DB ===');
    const { rows: sales } = await p.query(
      `SELECT tenant_id, COUNT(*), MIN(data_venda)::text, MAX(data_venda)::text FROM dash_vendas GROUP BY tenant_id`
    );
    console.log(sales);

    // 2. Search for ALICE in vendedores
    console.log('\\n=== ALICE SELLERS IN VET DB ===');
    const { rows: sellers } = await p.query(
      `SELECT tenant_id, id_firebird, nome FROM dash_vendedores WHERE nome ILIKE '%ALICE%'`
    );
    console.log(sellers);

    // 3. Search for KLEBER in clientes
    console.log('\\n=== KLEBER CLIENTS IN VET DB ===');
    const { rows: clients } = await p.query(
      `SELECT tenant_id, id_firebird, nome FROM dash_clientes WHERE nome ILIKE '%KLEBER%'`
    );
    console.log(clients);

  } catch (e) {
    console.error(e);
  } finally {
    p.end();
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

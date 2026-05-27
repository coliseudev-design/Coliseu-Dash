import paramiko
import json

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('177.39.17.7', username='root', password='6EFBC!c0:wzr%Ij')

# Acha o container atual do middleware
stdin, stdout, stderr = client.exec_command("docker ps --format '{{.Names}}\t{{.Status}}' | grep dashboard-middleware")
out = stdout.read().decode('utf-8').strip()
if not out:
    print("Middleware container not found!")
    client.close()
    exit()

MW = out.split('\t')[0].strip()
print(f"Using container: {MW}")

# Node script to run pg queries
node_script = """
const pg = require('pg');
const pool = new pg.Pool({
  host: process.env.PG_HOST,
  user: process.env.PG_USER,
  password: process.env.PG_PASSWORD,
  database: process.env.PG_DATABASE,
  port: parseInt(process.env.PG_PORT || 5432)
});

async function run() {
  try {
    // 1. Search for clients with 'kleber' or similar
    const clients = await pool.query("SELECT tenant_id, id_firebird, nome, documento FROM dash_clientes WHERE nome ILIKE '%kleber%'");
    console.log('CLIENTS:', JSON.stringify(clients.rows));

    // 2. Search for any orders containing 'kleber' client id
    if (clients.rows.length > 0) {
      const ids = clients.rows.map(c => c.id_firebird);
      const orders = await pool.query(`SELECT tenant_id, id_firebird, numero_pedido, data_venda, data_vencimento, cliente_id_firebird, valor_total, status FROM dash_vendas WHERE cliente_id_firebird IN (${ids.join(',')})`);
      console.log('ORDERS:', JSON.stringify(orders.rows));
    } else {
      console.log('ORDERS: []');
    }

    // 3. Let's search for recent sales in last 3 days
    const recent = await pool.query("SELECT tenant_id, id_firebird, numero_pedido, data_venda, data_vencimento, cliente_id_firebird, valor_total, status FROM dash_vendas ORDER BY data_venda DESC LIMIT 20");
    console.log('RECENT_SALES:', JSON.stringify(recent.rows));
  } catch (err) {
    console.error('ERROR:', err.message);
  } finally {
    await pool.end();
  }
}
run();
"""

cmd = f"docker exec {MW} node -e {json.dumps(node_script)} 2>&1"
stdin, stdout, stderr = client.exec_command(cmd)
result = stdout.read().decode('utf-8')
print("=== Results ===")
print(result)

client.close()

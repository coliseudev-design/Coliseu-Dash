import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('177.39.17.7', username='root', password='6EFBC!c0:wzr%Ij')

script = """
const db = require('./src/db/postgres');

async function run() {
  try {
    console.log('=== SALES BETWEEN 2026-05-25 AND 2026-06-10 ===');
    const { rows: sales } = await db.query(
      `SELECT tenant_id, COUNT(*), MIN(data_venda)::text, MAX(data_venda)::text, SUM(valor_total) FROM dash_vendas WHERE data_venda >= '2026-05-25' AND data_venda <= '2026-06-10' GROUP BY tenant_id`
    );
    console.log(sales);

    console.log('\\n=== DETAIL OF SALES ON 2026-05-31 OR 2026-06-01 FOR ALL TENANTS ===');
    const { rows: details } = await db.query(
      `SELECT tenant_id, id_firebird, cliente_id_firebird, vendedor_id_firebird, data_venda::text, valor_total, status, cfop FROM dash_vendas WHERE data_venda >= '2026-05-30 00:00:00' AND data_venda <= '2026-06-02 23:59:59' ORDER BY data_venda`
    );
    console.log(details);

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

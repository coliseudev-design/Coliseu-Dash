import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('177.39.17.7', username='root', password='6EFBC!c0:wzr%Ij')

script = """
const db = require('./src/db/postgres');

async function run() {
  try {
    console.log('=== SALES SEARCH BY VALUE ===');
    const { rows: sales } = await db.query(
      `SELECT id, tenant_id, id_firebird, cliente_id_firebird, vendedor_id_firebird, data_venda::text, valor_total, status, cfop, numero_pedido 
       FROM dash_vendas 
       WHERE valor_total IN (69.00, 254.90, 52.93, 39.07, 109.90, 65.65, 287.00, 356.00, 187.00, 305.82, 45.89, 35.82, 200.00)`
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

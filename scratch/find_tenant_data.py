import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('177.39.17.7', username='root', password='6EFBC!c0:wzr%Ij')

script = """
const db = require('./src/db/postgres');

async function run() {
  try {
    // 1. Group sales by tenant_id
    console.log('=== VENDAS POR TENANT ===');
    const { rows: sales } = await db.query(
      `SELECT tenant_id, COUNT(*), MIN(data_venda)::text as min_date, MAX(data_venda)::text as max_date FROM dash_vendas GROUP BY tenant_id`
    );
    console.log(sales);

    // 2. Query all users and their tenant_ids
    console.log('\\n=== USUARIOS POR TENANT ===');
    const { rows: users } = await db.query(
      `SELECT tenant_id, email, nome, role, layout_version FROM dash_usuarios`
    );
    console.log(users);

    // 3. Check if there are other tenants in dash_clientes
    console.log('\\n=== CLIENTES POR TENANT ===');
    const { rows: clientes } = await db.query(
      `SELECT tenant_id, COUNT(*) FROM dash_clientes GROUP BY tenant_id`
    );
    console.log(clientes);
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

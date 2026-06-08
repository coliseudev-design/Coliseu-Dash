import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('177.39.17.7', username='root', password='6EFBC!c0:wzr%Ij')

script = """
const db = require('./src/db/postgres');
const tenantId = '816f97c4-66fb-4ef8-905d-e0551cbf2492';

async function run() {
  try {
    const tables = ['dash_vendas', 'dash_vendas_itens', 'dash_clientes', 'dash_vendedores', 'dash_produtos', 'dash_devolucoes'];
    console.log('=== ROW COUNTS FOR PETCLUB TENANT ===');
    for (const t of tables) {
      const { rows } = await db.query(`SELECT COUNT(*) FROM ${t} WHERE tenant_id = $1`, [tenantId]);
      console.log(`${t}: ${rows[0].count}`);
    }
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

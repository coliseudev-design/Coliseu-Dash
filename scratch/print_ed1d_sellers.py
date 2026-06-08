import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('177.39.17.7', username='root', password='6EFBC!c0:wzr%Ij')

script = """
const db = require('./src/db/postgres');
const tenantId = 'ed1d3a98-4c4d-48db-99c0-8751926eb8e5';

async function run() {
  try {
    console.log('=== VENDEDORES FOR ed1d ===');
    const { rows: sellers } = await db.query(
      `SELECT id_firebird, nome FROM dash_vendedores WHERE tenant_id = $1`,
      [tenantId]
    );
    console.log(sellers);
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

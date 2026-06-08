import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('177.39.17.7', username='root', password='6EFBC!c0:wzr%Ij')

script = """
const { Pool } = require('pg');
const p = new Pool({
  host: 'coliseu-db',
  user: 'coliseu_admin',
  password: 'ColiseuDB2026Prod',
  database: 'coliseu_identity',
  port: 5432
});

async function run() {
  try {
    const { rows } = await p.query('SELECT "Id", "Name", "ContactEmail" FROM companies');
    console.log('=== COMPANIES ===');
    console.log(rows);
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

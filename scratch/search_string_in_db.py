import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('177.39.17.7', username='root', password='6EFBC!c0:wzr%Ij')

MIDDLEWARE_CONTAINER = "dashboard-middleware-irerzifjwjb4q8ucbpfk2gb8-005649123523"

# Node script content to search all tables for "MARILIA"
node_script = """
const pg = require('pg');
const pool = new pg.Pool({
  host: process.env.PG_HOST,
  user: process.env.PG_USER,
  password: process.env.PG_PASSWORD,
  database: process.env.PG_DATABASE,
  port: parseInt(process.env.PG_PORT || 5432),
  ssl: false
});

async function run() {
  const { rows: columns } = await pool.query(`
    SELECT table_name, column_name 
    FROM information_schema.columns 
    WHERE table_schema = 'public' AND data_type IN ('character varying', 'text')
  `);
  
  for (const col of columns) {
    try {
      const q = 'SELECT COUNT(*) FROM "' + col.table_name + '" WHERE "' + col.column_name + '" LIKE $1';
      const { rows } = await pool.query(q, ['%MARILIA%']);
      const count = parseInt(rows[0].count);
      if (count > 0) {
        console.log('Table:', col.table_name, 'Column:', col.column_name, 'Count:', count);
        const { rows: sample } = await pool.query('SELECT * FROM "' + col.table_name + '" WHERE "' + col.column_name + '" LIKE $1 LIMIT 1', ['%MARILIA%']);
        console.log('  Sample:', JSON.stringify(sample[0]));
      }
    } catch (e) {
      // ignore table column mismatch or other pg errors
    }
  }
  await pool.end();
}
run().catch(e => { console.error(e); pool.end(); });
"""

# Write and run the node script on the middleware container
node_script_escaped = node_script.replace('"', '\\"').replace('`', '\\`').replace('$', '\\$')
cmd = f'docker exec {MIDDLEWARE_CONTAINER} node -e "{node_script_escaped}"'
stdin, stdout, stderr = client.exec_command(cmd)

print("=== SEARCH RESULTS ===")
print(stdout.read().decode('utf-8'))
print("=== SEARCH ERRORS ===")
print(stderr.read().decode('utf-8'))

client.close()

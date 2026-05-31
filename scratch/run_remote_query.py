import paramiko

host = '177.39.17.7'
user = 'root'
password = '6EFBC!c0:wzr%Ij'
container = 'dashboard-middleware-irerzifjwjb4q8ucbpfk2gb8-184006524856'

js_content = r"""
const { Pool } = require('pg');
const pool = new Pool({
    host: 'coliseu-db',
    port: 5432,
    database: 'coliseu_dashboard_vet',
    user: 'coliseu_admin',
    password: 'ColiseuDB2026Prod'
});

async function run() {
    try {
        console.log("Starting DB query on VET database...");
        const tables = ['dash_vendas', 'dash_clientes', 'dash_vendedores', 'dash_vendas_itens', 'dash_produtos'];
        for (const t of tables) {
            const res = await pool.query(`SELECT COUNT(*) FROM ${t}`);
            console.log(`Table ${t}: ${res.rows[0].count} rows`);
        }
    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}
run();
"""

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
try:
    client.connect(host, username=user, password=password)
    
    # Write to local file on remote server
    sftp = client.open_sftp()
    f = sftp.file('/tmp/test_query.js', 'w')
    f.write(js_content)
    f.close()
    sftp.close()
    
    # Copy file into container
    stdin, stdout, stderr = client.exec_command(f"docker cp /tmp/test_query.js {container}:/tmp/test_query.js")
    err = stderr.read().decode('utf-8')
    if err:
        print("Copy Error:", err)
        
    # Execute node script inside container with NODE_PATH
    stdin, stdout, stderr = client.exec_command(f"docker exec -e NODE_PATH=/usr/src/app/node_modules {container} node /tmp/test_query.js")
    out = stdout.read().decode('utf-8')
    err = stderr.read().decode('utf-8')
    
    print("STDOUT:")
    print(out)
    if err:
        print("STDERR:")
        print(err)
        
except Exception as e:
    print("Error:", e)
finally:
    client.close()

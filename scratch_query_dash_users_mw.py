import paramiko

HOST = '177.39.17.7'
USER = 'root'
PASS = '6EFBC!c0:wzr%Ij'
MW_CONTAINER = 'dashboard-middleware-irerzifjwjb4q8ucbpfk2gb8-144356492056'

node_code = """
const db = require('./src/db/postgres');
db.dbContext.run({ dbType: 'main' }, async () => {
    try {
        const u = await db.query('SELECT id, tenant_id, email, nome, layout_version FROM dash_usuarios');
        console.log('USERS IN MIDDLEWARE DATABASE:');
        console.log(JSON.stringify(u.rows, null, 2));

        const f = await db.query('SELECT * FROM dash_filiais');
        console.log('FILIAIS IN MIDDLEWARE DATABASE:');
        console.log(JSON.stringify(f.rows, null, 2));
    } catch(e) {
        console.error('ERR:', e.message);
    }
    process.exit(0);
});
"""

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
try:
    client.connect(HOST, username=USER, password=PASS)
    stdin, stdout, stderr = client.exec_command(f'docker exec -i {MW_CONTAINER} node')
    stdin.write(node_code)
    stdin.close()
    print(stdout.read().decode('utf-8'))
    print(stderr.read().decode('utf-8'))
except Exception as e:
    print("ERR:", e)
finally:
    client.close()

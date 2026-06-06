import paramiko
import json

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('177.39.17.7', username='root', password='6EFBC!c0:wzr%Ij', timeout=15)

stdin, stdout, stderr = client.exec_command("docker ps --format '{{.Names}}' | grep 'dashboard-middleware'")
MW = stdout.read().decode('utf-8').strip()

script = """
const { Pool } = require('pg');

const databases = ['coliseu_dashboard', 'coliseu_dashboard_vet', 'coliseu_identity'];
const searchUuid = '816f97c4-66fb-4ef8-905d-e0551cbf2942';

async function search(dbName) {
    const p = new Pool({
        host: process.env.PG_HOST || 'localhost',
        user: process.env.PG_USER || 'coliseu_admin',
        password: process.env.PG_PASSWORD || 'ColiseuDB2026Prod',
        database: dbName,
        port: parseInt(process.env.PG_PORT || 5432)
    });
    try {
        const tableList = await p.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public'");
        for (const r of tableList.rows) {
            const cols = await p.query(`SELECT column_name FROM information_schema.columns WHERE table_name='${r.table_name}'`);
            for (const col of cols.rows) {
                try {
                    const check = await p.query(`SELECT COUNT(*) as count FROM ${r.table_name} WHERE CAST("${col.column_name}" AS TEXT) = $1`, [searchUuid]);
                    if (parseInt(check.rows[0].count) > 0) {
                        console.log(`FOUND in DB: ${dbName}, Table: ${r.table_name}, Col: ${col.column_name}, Count: ${check.rows[0].count}`);
                        const sample = await p.query(`SELECT * FROM ${r.table_name} WHERE CAST("${col.column_name}" AS TEXT) = $1 LIMIT 1`, [searchUuid]);
                        console.log("Sample:", sample.rows[0]);
                    }
                } catch(e) {}
            }
        }
    } catch(e) {
        console.error(`Error in ${dbName}: ${e.message}`);
    } finally {
        await p.end();
    }
}

async function run() {
    for (const dbName of databases) {
        await search(dbName);
    }
}
run();
"""

stdin, stdout, stderr = client.exec_command(f"docker exec -i {MW} node")
stdin.write(script)
stdin.close()

result = stdout.read().decode('utf-8')
err_result = stderr.read().decode('utf-8')

print("=== Resultado ===")
print(result)
if err_result:
    print("=== Erros ===")
    print(err_result)

client.close()

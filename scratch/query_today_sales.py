import paramiko
import time

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())

connected = False
for attempt in range(5):
    try:
        client.connect('177.39.17.7', username='root', password='6EFBC!c0:wzr%Ij', timeout=10)
        connected = True
        break
    except Exception as e:
        time.sleep(2)

if not connected:
    exit(1)

stdin, stdout, stderr = client.exec_command("docker ps --format '{{.Names}}' | grep 'dashboard-middleware'")
MW = stdout.read().decode('utf-8').strip()

script = """
const { Pool } = require('pg');
const p = new Pool({
    host: '2.24.82.19',
    user: 'postgres',
    password: '0r0E6oV!qG3h',
    database: 'coliseudash',
    port: 5432,
    connectionTimeoutMillis: 5000
});

async function run() {
    try {
        console.log("=== Querying Production DB dash_clientes ===");
        const c1 = await p.query("SELECT id_firebird, nome, tenant_id FROM dash_clientes WHERE nome ILIKE '%RACHEL%' OR nome ILIKE '%SILESIA%'");
        console.log("Clientes:", c1.rows);

        console.log("=== Querying Production DB dash_vendas ===");
        const v1 = await p.query("SELECT id_firebird, numero_pedido, data_venda::text, data_vencimento::text, valor_total, status, tenant_id FROM dash_vendas WHERE numero_pedido IN ('514592', '514591', '196540', '196539') OR id_firebird IN (514592, 514591)");
        console.log("Vendas by Numbers:", v1.rows);

    } catch(e) {
        console.error("ERR:" + e.message);
    } finally {
        await p.end();
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

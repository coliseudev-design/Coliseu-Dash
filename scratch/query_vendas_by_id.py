import paramiko
import os

HOST     = '177.39.17.7'
USER     = 'root'
PASSWORD = '6EFBC!c0:wzr%Ij'

def main():
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        client.connect(HOST, username=USER, password=PASSWORD)
        print("Connected to VPS")

        # Discover active container name dynamically
        stdin, stdout, stderr = client.exec_command("docker ps --format '{{.Names}}' | grep 'dashboard-middleware'")
        container_name = stdout.read().decode('utf-8').strip().split('\n')[0]
        if not container_name:
            print("Error: middleware container not found!")
            return
        print(f"Container: {container_name}")

        # Write local temp query script
        js_code = """
const { Pool } = require('pg');
const config = require('./src/config/env');

const poolMain = new Pool({
  host: config.postgres.host,
  port: config.postgres.port,
  database: config.postgres.database,
  user: config.postgres.user,
  password: config.postgres.password,
  ssl: config.postgres.ssl ? { rejectUnauthorized: false } : false
});

const poolVet = new Pool({
  host: config.postgresVet.host,
  port: config.postgresVet.port,
  database: config.postgresVet.database,
  user: config.postgresVet.user,
  password: config.postgresVet.password,
  ssl: config.postgresVet.ssl ? { rejectUnauthorized: false } : false
});

async function query() {
  console.log('--- Config Envs ---');
  console.log('Main DB:', config.postgres.database, 'Host:', config.postgres.host);
  console.log('Vet DB:', config.postgresVet.database, 'Host:', config.postgresVet.host);

  try {
    console.log('--- Main Pool: Sales Count ---');
    const r1 = await poolMain.query("SELECT tenant_id, COUNT(*) FROM dash_vendas GROUP BY tenant_id");
    console.log(JSON.stringify(r1.rows, null, 2));

    console.log('--- Main Pool: Latest Sales ---');
    const r2 = await poolMain.query("SELECT tenant_id, id_firebird, numero_pedido, data_venda, valor_total FROM dash_vendas ORDER BY data_venda DESC LIMIT 10");
    console.log(JSON.stringify(r2.rows, null, 2));
  } catch (e) {
    console.error('Error querying Main Pool:', e.message);
  }

  try {
    console.log('--- Vet Pool: Sales Count ---');
    const r1 = await poolVet.query("SELECT tenant_id, COUNT(*) FROM dash_vendas GROUP BY tenant_id");
    console.log(JSON.stringify(r1.rows, null, 2));

    console.log('--- Vet Pool: Latest Sales ---');
    const r2 = await poolVet.query("SELECT tenant_id, id_firebird, numero_pedido, data_venda, valor_total FROM dash_vendas ORDER BY data_venda DESC LIMIT 10");
    console.log(JSON.stringify(r2.rows, null, 2));
  } catch (e) {
    console.error('Error querying Vet Pool:', e.message);
  }

  poolMain.end();
  poolVet.end();
}

query();
"""
        local_path = "scratch/temp_query_by_id.js"
        with open(local_path, "w", encoding="utf-8") as f:
            f.write(js_code)
        
        # Upload JS to VPS
        sftp = client.open_sftp()
        sftp.put(local_path, "/tmp/query_by_id.js")
        sftp.close()

        # Copy to container and run
        client.exec_command(f"docker cp /tmp/query_by_id.js {container_name}:/usr/src/app/query_by_id.js")
        stdin, stdout, stderr = client.exec_command(f"docker exec -w /usr/src/app {container_name} node query_by_id.js")
        out = stdout.read().decode('utf-8', errors='replace').strip()
        err = stderr.read().decode('utf-8', errors='replace').strip()
        
        if out:
            print("OUTPUT:")
            print(out)
        if err:
            print("ERROR:")
            print(err)

        # Cleanup
        client.exec_command(f"docker exec {container_name} rm /usr/src/app/query_by_id.js")
        client.exec_command("rm /tmp/query_by_id.js")
        if os.path.exists(local_path):
            os.remove(local_path)

    except Exception as e:
        print(f"Error: {e}")
    finally:
        client.close()

if __name__ == '__main__':
    main()

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
const pool = new Pool({
  host: 'coliseu-db',
  user: 'coliseu_admin',
  password: 'ColiseuDB2026Prod',
  database: 'coliseu_dashboard',
  port: 5432
});

async function query() {
  try {
    console.log('--- Search for Piveta in dash_usuarios ---');
    const resUsers = await pool.query(
      "SELECT id, email, nome, role, tenant_id, layout_version FROM dash_usuarios WHERE nome ILIKE '%piveta%' OR email ILIKE '%piveta%'"
    );
    console.log(JSON.stringify(resUsers.rows, null, 2));

    console.log('--- Search for Piveta in dash_filiais ---');
    const resFiliais = await pool.query(
      "SELECT * FROM dash_filiais WHERE nome ILIKE '%piveta%'"
    );
    console.log(JSON.stringify(resFiliais.rows, null, 2));

    console.log('--- Search for Piveta in dash_clientes ---');
    const resClientes = await pool.query(
      "SELECT id_firebird, nome, document, tenant_id FROM (SELECT id_firebird, nome, documento as document, tenant_id FROM dash_clientes) x WHERE nome ILIKE '%piveta%' LIMIT 5"
    );
    console.log(JSON.stringify(resClientes.rows, null, 2));

  } catch (err) {
    console.error(err.message);
  } finally {
    pool.end();
  }
}

query();
"""
        local_path = "scratch/temp_find_piveta.js"
        with open(local_path, "w", encoding="utf-8") as f:
            f.write(js_code)
        
        # Upload JS to VPS
        sftp = client.open_sftp()
        sftp.put(local_path, "/tmp/find_piveta.js")
        sftp.close()

        # Copy to container and run
        client.exec_command(f"docker cp /tmp/find_piveta.js {container_name}:/usr/src/app/find_piveta.js")
        stdin, stdout, stderr = client.exec_command(f"docker exec -w /usr/src/app {container_name} node find_piveta.js")
        out = stdout.read().decode('utf-8', errors='replace').strip()
        err = stderr.read().decode('utf-8', errors='replace').strip()
        
        if out:
            print("OUTPUT:")
            print(out)
        if err:
            print("ERROR:")
            print(err)

        # Cleanup
        client.exec_command(f"docker exec {container_name} rm /usr/src/app/find_piveta.js")
        client.exec_command("rm /tmp/find_piveta.js")
        if os.path.exists(local_path):
            os.remove(local_path)

    except Exception as e:
        print(f"Error: {e}")
    finally:
        client.close()

if __name__ == '__main__':
    main()

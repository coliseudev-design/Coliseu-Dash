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
    console.log('--- Tables list ---');
    const resTables = await pool.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name"
    );
    console.log(JSON.stringify(resTables.rows, null, 2));

    // Check if dash_empresas or similar table exists
    const tables = resTables.rows.map(r => r.table_name);
    
    // Look up company/tenant settings in dash_configuracoes or similar tables
    for (const t of ['dash_empresas', 'dash_configuracoes', 'dash_tenants', 'dash_compania', 'dash_filiais']) {
      if (tables.includes(t)) {
        console.log(`--- Content of ${t} ---`);
        try {
          const resT = await pool.query(`SELECT * FROM ${t} LIMIT 10`);
          console.log(JSON.stringify(resT.rows, null, 2));
        } catch (e) {
          console.error(`Error reading ${t}:`, e.message);
        }
      }
    }
  } catch (err) {
    console.error(err.message);
  } finally {
    pool.end();
  }
}

query();
"""
        local_path = "scratch/temp_query_companies.js"
        with open(local_path, "w", encoding="utf-8") as f:
            f.write(js_code)
        
        # Upload JS to VPS
        sftp = client.open_sftp()
        sftp.put(local_path, "/tmp/query_companies.js")
        sftp.close()

        # Copy to container and run
        client.exec_command(f"docker cp /tmp/query_companies.js {container_name}:/usr/src/app/query_companies.js")
        stdin, stdout, stderr = client.exec_command(f"docker exec -w /usr/src/app {container_name} node query_companies.js")
        out = stdout.read().decode('utf-8', errors='replace').strip()
        err = stderr.read().decode('utf-8', errors='replace').strip()
        
        if out:
            print("OUTPUT:")
            print(out)
        if err:
            print("ERROR:")
            print(err)

        # Cleanup
        client.exec_command(f"docker exec {container_name} rm /usr/src/app/query_companies.js")
        client.exec_command("rm /tmp/query_companies.js")
        if os.path.exists(local_path):
            os.remove(local_path)

    except Exception as e:
        print(f"Error: {e}")
    finally:
        client.close()

if __name__ == '__main__':
    main()

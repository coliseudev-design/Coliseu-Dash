import paramiko
import json

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

        # Run query inside the container via node.js
        # We fetch the sync metadata table
        js_code = """
const { Pool } = require('pg');
const pool = new Pool({
  host: 'coliseu-db',
  user: 'coliseu_admin',
  password: 'ColiseuDB2026Prod',
  database: 'coliseu_dashboard',
  port: 5432
});
pool.query('SELECT tenant_id, tabela, ultima_sincronizacao, registros_sincronizados, status, erro_mensagem FROM dash_sync_metadata')
  .then(r => {
    console.log(JSON.stringify(r.rows, null, 2));
    pool.end();
  })
  .catch(e => {
    console.error(e.message);
    pool.end();
  });
"""
        # escape double quotes and newlines for shell execution
        js_code_escaped = js_code.replace('\\', '\\\\').replace('"', '\\"').replace('\n', ' ')
        cmd = f'docker exec {container_name} node -e "{js_code_escaped}"'
        
        stdin, stdout, stderr = client.exec_command(cmd)
        out = stdout.read().decode('utf-8', errors='replace').strip()
        err = stderr.read().decode('utf-8', errors='replace').strip()
        
        if out:
            print("OUTPUT:")
            print(out)
        if err:
            print("ERROR:")
            print(err)

    except Exception as e:
        print(f"Error: {e}")
    finally:
        client.close()

if __name__ == '__main__':
    main()

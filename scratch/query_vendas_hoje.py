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

const tenantId = 'a822a7e7-fdd4-4483-bbb5-26587a72739f';

async function query() {
  try {
    console.log('--- Sales in dash_vendas for today (data_venda = 2026-06-08) ---');
    const resVendas = await pool.query(
      "SELECT id_firebird, numero_pedido, data_venda, data_vencimento, data_hora_proc, valor_total, status, sincronizado_em FROM dash_vendas WHERE tenant_id = $1 AND (data_venda::date = '2026-06-08' OR data_hora_proc::date = '2026-06-08')",
      [tenantId]
    );
    console.log(JSON.stringify(resVendas.rows, null, 2));

    const ids = resVendas.rows.map(r => r.id_firebird);
    if (ids.length > 0) {
      console.log('--- Sales items in dash_vendas_itens for these sales ---');
      const resItens = await pool.query(
        "SELECT id_firebird, venda_id_firebird, produto_id_firebird, quantidade, preco_unitario, valor_total, produto, marca FROM dash_vendas_itens WHERE tenant_id = $1 AND venda_id_firebird = ANY($2)",
        [tenantId, ids]
      );
      console.log(JSON.stringify(resItens.rows, null, 2));
    } else {
      console.log('No sales found for 2026-06-08');
    }
  } catch (err) {
    console.error(err.message);
  } finally {
    pool.end();
  }
}

query();
"""
        local_path = "scratch/temp_query.js"
        with open(local_path, "w", encoding="utf-8") as f:
            f.write(js_code)
        
        # Upload JS to VPS
        sftp = client.open_sftp()
        sftp.put(local_path, "/tmp/query_temp.js")
        sftp.close()

        # Copy to container and run
        client.exec_command(f"docker cp /tmp/query_temp.js {container_name}:/usr/src/app/query_temp.js")
        stdin, stdout, stderr = client.exec_command(f"docker exec -w /usr/src/app {container_name} node query_temp.js")
        out = stdout.read().decode('utf-8', errors='replace').strip()
        err = stderr.read().decode('utf-8', errors='replace').strip()
        
        if out:
            print("OUTPUT:")
            print(out)
        if err:
            print("ERROR:")
            print(err)

        # Cleanup
        client.exec_command(f"docker exec {container_name} rm /usr/src/app/query_temp.js")
        client.exec_command("rm /tmp/query_temp.js")
        if os.path.exists(local_path):
            os.remove(local_path)

    except Exception as e:
        print(f"Error: {e}")
    finally:
        client.close()

if __name__ == '__main__':
    main()

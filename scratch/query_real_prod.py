import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('177.39.17.7', username='root', password='6EFBC!c0:wzr%Ij')

# Get middleware container name
stdin, stdout, stderr = client.exec_command("docker ps --format '{{.Names}}' | grep 'dashboard-middleware'")
MW = stdout.read().decode('utf-8').strip()
print(f"Container middleware: {MW}")

# Node.js query script to execute inside the middleware container
script = (
    "const {Pool}=require('pg');"
    "const p=new Pool({host:'2.24.82.19',user:'postgres',password:'0r0E6oV!qG3h',database:'coliseudash',port:5432,connectionTimeoutMillis:5000});"
    
    # 1. Distinct tenant IDs in dash_usuarios on 2.24.82.19
    "p.query('SELECT DISTINCT tenant_id, email, layout_version FROM dash_usuarios').then(r=>{"
    "  console.log('USUARIOS:'+JSON.stringify(r.rows));"
    
    # 2. Search for centurion or zeferino in dash_clientes
    "  return p.query(\"SELECT id_firebird, nome, tenant_id FROM dash_clientes WHERE nome ILIKE '%centurion%' OR nome ILIKE '%zeferino%' OR nome ILIKE '%simoes%' LIMIT 10\");"
    "}).then(r=>{"
    "  console.log('CLIENTES:'+JSON.stringify(r.rows));"
    
    # 3. Search for Hugo's order and Kleber's order by numero_pedido
    "  return p.query(\"SELECT tenant_id, numero_pedido, id_firebird, status, valor_total, data_venda::text, data_vencimento::text FROM dash_vendas WHERE TRIM(numero_pedido) IN ('229124', '196543') OR id_firebird IN (513034, 514595) OR valor_total IN (356.00, 247.00, 58.00) LIMIT 10\");"
    "}).then(r=>{"
    "  console.log('VENDAS:'+JSON.stringify(r.rows));"
    
    # 4. Search for top recent sales for Pet Club tenant if found, or just show last 5 syncs in metadata
    "  return p.query('SELECT tenant_id, tabela, registros_sincronizados, status, ultima_sincronizacao::text FROM dash_sync_metadata ORDER BY ultima_sincronizacao DESC LIMIT 10');"
    "}).then(r=>{"
    "  console.log('SYNC_METADATA:'+JSON.stringify(r.rows));"
    "  return p.end();"
    "}).catch(e=>{"
    "  console.error('ERR:'+e.message);"
    "  p.end();"
    "});"
)

# Escape double quotes for shell execution
script_escaped = script.replace('"', '\\"')
cmd = f'docker exec {MW} node -e "{script_escaped}" 2>&1'
stdin, stdout, stderr = client.exec_command(cmd)
print("=== Output from 2.24.82.19 Database ===")
print(stdout.read().decode('utf-8'))
client.close()

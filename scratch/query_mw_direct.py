import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('177.39.17.7', username='root', password='6EFBC!c0:wzr%Ij')

# Get middleware container name
stdin, stdout, stderr = client.exec_command("docker ps --format '{{.Names}}' | grep 'dashboard-middleware'")
MW = stdout.read().decode('utf-8').strip()
print(f"Container middleware: {MW}")

script = (
    "const {Pool}=require('pg');"
    "const p=new Pool({host:process.env.PG_HOST||'localhost',"
    "user:process.env.PG_USER||'coliseu_admin',"
    "password:process.env.PG_PASSWORD||'ColiseuDB2026Prod',"
    "database:process.env.PG_DATABASE||'coliseu_dashboard',"
    "port:parseInt(process.env.PG_PORT||5432),"
    "connectionTimeoutMillis:5000});"
    
    # 1. Row count of sales in June 2026 grouped by tenant
    "p.query(\"SELECT tenant_id, COUNT(*), MIN(data_venda::text), MAX(data_venda::text) FROM dash_vendas GROUP BY tenant_id\").then(r=>{"
    "  console.log('TENANT_COUNTS:'+JSON.stringify(r.rows));"
    
    # 2. Select recent sales in June 2026
    "  return p.query(\"SELECT tenant_id, numero_pedido, id_firebird, status, valor_total, data_venda::text, data_vencimento::text FROM dash_vendas WHERE data_venda >= '2026-06-01' LIMIT 20\");"
    "}).then(r=>{"
    "  console.log('RECENT_SALES:'+JSON.stringify(r.rows));"
    
    # 3. Check if there are any clients in dash_clientes
    "  return p.query(\"SELECT tenant_id, COUNT(*) FROM dash_clientes GROUP BY tenant_id\");"
    "}).then(r=>{"
    "  console.log('CLIENT_COUNTS:'+JSON.stringify(r.rows));"
    
    # 4. Check if there are any items in dash_vendas_itens
    "  return p.query(\"SELECT tenant_id, COUNT(*) FROM dash_vendas_itens GROUP BY tenant_id\");"
    "}).then(r=>{"
    "  console.log('ITEM_COUNTS:'+JSON.stringify(r.rows));"
    "  return p.end();"
    "}).catch(e=>{console.error('ERR:'+e.message);p.end();});"
)

# Escape double quotes for shell execution
script_escaped = script.replace('"', '\\"')
cmd = f'docker exec {MW} node -e "{script_escaped}" 2>&1'
stdin, stdout, stderr = client.exec_command(cmd)
print("=== Output from Middleware Node Query ===")
print(stdout.read().decode('utf-8'))
client.close()

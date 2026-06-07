import paramiko
import json

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('177.39.17.7', username='root', password='6EFBC!c0:wzr%Ij')

# Get middleware container name
stdin, stdout, stderr = client.exec_command("docker ps --format '{{.Names}}' | grep 'dashboard-middleware'")
MW = stdout.read().decode('utf-8').strip()
print(f"Container middleware: {MW}")

script = (
    "const {Pool}=require('pg');"
    "const p=new Pool({host:'2.24.82.19',user:'postgres',password:'0r0E6oV!qG3h',database:'coliseudash',port:5432,connectionTimeoutMillis:5000});"
    
    # 1. Query distinct tenants in sales table
    "p.query('SELECT DISTINCT tenant_id FROM dash_vendas').then(r=>{"
    "  console.log('TENANTS:'+JSON.stringify(r.rows));"
    
    # 2. Query June 2026 sales for our tenant 816f97c4-66fb-4ef8-905d-e0551cbf2492
    "  const tenant = '816f97c4-66fb-4ef8-905d-e0551cbf2492';"
    "  return p.query('SELECT id_firebird, numero_pedido, data_venda, valor_total, status FROM dash_vendas WHERE tenant_id = $1 AND data_venda >= \\'2026-06-01\\' ORDER BY data_venda', [tenant]);"
    "}).then(r=>{"
    "  console.log('JUNE_SALES:'+JSON.stringify(r.rows));"
    "  return p.end();"
    "}).catch(e=>{"
    "  console.error('ERR:'+e.message);"
    "  p.end();"
    "});"
)

cmd = f"docker exec {MW} node -e \"{script}\" 2>&1"
stdin, stdout, stderr = client.exec_command(cmd)
print("=== Output ===")
print(stdout.read().decode('utf-8'))
client.close()

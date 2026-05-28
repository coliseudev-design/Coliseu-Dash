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
    
    # 1. Distinct tenants
    "p.query('SELECT DISTINCT tenant_id FROM dash_vendas').then(r=>{"
    "  console.log('TENANTS:'+JSON.stringify(r.rows));"
    
    # 2. Count tables for tenant 3edd56b4-e002-48ed-8ecb-131c0c62dcfb
    "  const tenant = '3edd56b4-e002-48ed-8ecb-131c0c62dcfb';"
    "  return Promise.all(["
    "    p.query('SELECT COUNT(*) as c FROM dash_clientes WHERE tenant_id = $1', [tenant]),"
    "    p.query('SELECT COUNT(*) as c FROM dash_produtos WHERE tenant_id = $1', [tenant]),"
    "    p.query('SELECT COUNT(*) as c FROM dash_vendedores WHERE tenant_id = $1', [tenant]),"
    "    p.query('SELECT COUNT(*) as c FROM dash_vendas WHERE tenant_id = $1', [tenant]),"
    "    p.query('SELECT COUNT(*) as c FROM dash_vendas_itens WHERE tenant_id = $1', [tenant]),"
    "    p.query('SELECT COUNT(*) as c FROM dash_financeiro WHERE tenant_id = $1', [tenant]),"
    "    p.query('SELECT COUNT(*) as c FROM dash_devolucoes WHERE tenant_id = $1', [tenant])"
    "  ]);"
    "}).then(results=>{"
    "  const tables = ['clientes','produtos','vendedores','vendas','itens','financeiro','devolucoes'];"
    "  tables.forEach((t, i) => console.log('COUNT:' + t + '=' + results[i].rows[0].c));"
    
    # 3. Dec 2025 faturamento for tenant 3edd56b4-e002-48ed-8ecb-131c0c62dcfb
    "  const tenant = '3edd56b4-e002-48ed-8ecb-131c0c62dcfb';"
    "  return p.query('SELECT status, COUNT(*) as count, SUM(valor_total) as sum FROM dash_vendas WHERE tenant_id = $1 AND data_venda >= \\'2025-12-01 00:00:00\\' AND data_venda <= \\'2025-12-31 23:59:59\\' GROUP BY status', [tenant]);"
    "}).then(r=>{"
    "  console.log('SALES:'+JSON.stringify(r.rows));"
    
    # 4. Dec 2025 devolucoes
    "  const tenant = '3edd56b4-e002-48ed-8ecb-131c0c62dcfb';"
    "  return p.query('SELECT COUNT(*) as count, SUM(valor) as sum FROM dash_devolucoes WHERE tenant_id = $1 AND data_devolucao >= \\'2025-12-01 00:00:00\\' AND data_devolucao <= \\'2025-12-31 23:59:59\\'', [tenant]);"
    "}).then(r=>{"
    "  console.log('DEVOLUCOES:'+JSON.stringify(r.rows));"
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

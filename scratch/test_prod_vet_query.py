import paramiko, json

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('177.39.17.7', username='root', password='6EFBC!c0:wzr%Ij')

# Descobre o container atual do middleware
stdin, stdout, stderr = client.exec_command("docker ps --format '{{.Names}}' | grep 'dashboard-middleware'")
MW = stdout.read().decode('utf-8').strip()
print(f"Container middleware: {MW}")

# Script node para testar conexão e query com poolVet
script = (
    "const {Pool}=require('pg');"
    "const p=new Pool({"
    "host:process.env.PG_HOST_VET||'localhost',"
    "user:process.env.PG_USER_VET||'coliseu_admin',"
    "password:process.env.PG_PASSWORD_VET !== undefined ? process.env.PG_PASSWORD_VET : 'ColiseuDB2026Prod',"
    "database:process.env.PG_DATABASE_VET||'coliseu_dashboard_vet',"
    "port:parseInt(process.env.PG_PORT_VET||5432),"
    "connectionTimeoutMillis:5000"
    "});"
    "console.log('Using config:', {host:process.env.PG_HOST_VET, user:process.env.PG_USER_VET, db:process.env.PG_DATABASE_VET, pass_empty: process.env.PG_PASSWORD_VET === ''});"
    "p.query('SELECT 1 as ok').then(r=>{"
    "  console.log('Connected to Vet DB successfully');"
    "  return p.query('SELECT MAX(data_venda) AS max_date FROM dash_vendas WHERE tenant_id = \\'3edd56b4-e002-48ed-8ecb-131c0c62dcfb\\'');"
    "}).then(r=>{"
    "  console.log('Max date:', r.rows[0]);"
    "  const start = '2025-12-01';"
    "  const end = '2025-12-31';"
    "  const tenantId = '3edd56b4-e002-48ed-8ecb-131c0c62dcfb';"
    "  const limit = 100;"
    "  const sql = 'SELECT v.vendedor_id_firebird AS id, COALESCE(vd.nome, \\'Vendedor \\' || COALESCE(v.vendedor_id_firebird::text, \\'?\\')) AS nome, SUM(v.valor_total) AS total, COUNT(DISTINCT v.id_firebird) AS qtd_pedidos, AVG(v.valor_total) AS ticket_medio FROM dash_vendas v LEFT JOIN dash_vendedores vd ON vd.id_firebird = v.vendedor_id_firebird AND vd.tenant_id = v.tenant_id WHERE v.tenant_id = $1 AND v.data_venda >= $2 AND v.data_venda <= $3 GROUP BY v.vendedor_id_firebird, vd.nome ORDER BY total DESC LIMIT $4';"
    "  return p.query(sql, [tenantId, start, end, limit]);"
    "}).then(r=>{"
    "  console.log('Query result count:', r.rowCount);"
    "  p.end();"
    "}).catch(e=>{"
    "  console.error('ERROR STACK:', e.stack);"
    "  p.end();"
    "});"
)

# Escapando os caracteres especiais de shell como $
escaped_script = script.replace('$', '\\$')
cmd = f"docker exec {MW} node -e \"{escaped_script}\" 2>&1"
stdin, stdout, stderr = client.exec_command(cmd)
result = stdout.read().decode('utf-8')
print("=== Output ===")
print(result)

client.close()

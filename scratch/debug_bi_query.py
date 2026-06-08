import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('177.39.17.7', username='root', password='6EFBC!c0:wzr%Ij')

stdin, stdout, stderr = client.exec_command("docker ps --format '{{.Names}}' | grep 'dashboard-middleware'")
MW = stdout.read().decode('utf-8').strip()
print(f"Container middleware: {MW}")

script = """
const db = require('./src/db/postgres');
const { getPeriodRange, toSafeSqlString } = require('./src/utils/period');
const cfopUtil = require('./src/utils/cfop');
const tenantId = '816f97c4-66fb-4ef8-905d-e0551cbf2492';

db.query('SELECT MAX(data_venda) AS max_date FROM dash_vendas WHERE tenant_id = $1', [tenantId])
.then(async ({rows}) => {
  const anchorDate = rows[0].max_date ? new Date(rows[0].max_date) : new Date();
  console.log('anchorDate:', anchorDate.toISOString());
  
  const pr = getPeriodRange('thisMonth', null, null, anchorDate);
  console.log('getPeriodRange output:', pr);
  
  const start = new Date(pr.start.replace(' ', 'T'));
  const end = new Date(pr.end.replace(' ', 'T'));
  console.log('Parsed start:', start.toISOString(), 'Parsed end:', end.toISOString());
  
  const startSql = toSafeSqlString(start);
  const endSql = toSafeSqlString(end);
  console.log('toSafeSqlString(start):', startSql, 'toSafeSqlString(end):', endSql);
  
  const salesFilter = cfopUtil.getSalesFilterClause('v');
  console.log('salesFilter:', salesFilter);
  
  const q = `SELECT COUNT(*), SUM(v.valor_total) FROM dash_vendas v WHERE v.tenant_id = $1 AND v.data_venda >= $2 AND v.data_venda <= $3 ${salesFilter}`;
  const {rows: res} = await db.query(q, [tenantId, startSql, endSql]);
  console.log('Query Result:', res);
  
  db.end();
}).catch(e => { console.error(e); db.end(); });
"""

stdin, stdout, stderr = client.exec_command(f"docker exec -i {MW} node")
stdin.write(script)
stdin.close()

print("STDOUT:")
print(stdout.read().decode('utf-8'))
print("STDERR:")
print(stderr.read().decode('utf-8'))
client.close()

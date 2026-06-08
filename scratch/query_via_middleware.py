import paramiko

HOST = '177.39.17.7'
USER = 'root'
PASS = '6EFBC!c0:wzr%Ij'
MW_CONTAINER = 'dashboard-middleware-irerzifjwjb4q8ucbpfk2gb8-010649342983'

def run_middleware_query(js_code, label):
    cmd = f'docker exec {MW_CONTAINER} node -e "{js_code}"'
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        client.connect(HOST, username=USER, password=PASS)
        _, stdout, stderr = client.exec_command(cmd)
        out = stdout.read().decode('utf-8')
        err = stderr.read().decode('utf-8')
        print(f"\n=== {label} ===")
        print(out or "(no stdout)")
        if err.strip():
            print("ERR:", err)
    except Exception as e:
        print(f"[ERROR] {label}: {e}")
    finally:
        client.close()

# 1. Check distinct tenants and sales counts in main context
js_code_1 = """
const db = require('./src/db/postgres');
db.dbContext.run({ dbType: 'main' }, async () => {
  try {
    const res = await db.query('SELECT tenant_id, COUNT(*), SUM(valor_total) FROM dash_vendas GROUP BY tenant_id');
    console.log(JSON.stringify(res.rows, null, 2));
  } catch(e) {
    console.error('ERR:', e.message);
  }
  process.exit(0);
});
"""
run_middleware_query(js_code_1, "Sales Counts by Tenant (main)")

# 2. Check distinct tenants and sales counts in vet context
js_code_2 = """
const db = require('./src/db/postgres');
db.dbContext.run({ dbType: 'vet' }, async () => {
  try {
    const res = await db.query('SELECT tenant_id, COUNT(*), SUM(valor_total) FROM dash_vendas GROUP BY tenant_id');
    console.log(JSON.stringify(res.rows, null, 2));
  } catch(e) {
    console.error('ERR:', e.message);
  }
  process.exit(0);
});
"""
run_middleware_query(js_code_2, "Sales Counts by Tenant (vet)")

# 3. Search for HUGO in dash_clientes or dash_vendas in main database
js_code_3 = """
const db = require('./src/db/postgres');
db.dbContext.run({ dbType: 'main' }, async () => {
  try {
    const res = await db.query("SELECT id_firebird, tenant_id, nome FROM dash_clientes WHERE nome ILIKE '%HUGO%' OR nome ILIKE '%DAYANE%'");
    console.log(JSON.stringify(res.rows, null, 2));
  } catch(e) {
    console.error('ERR:', e.message);
  }
  process.exit(0);
});
"""
run_middleware_query(js_code_3, "Search Customer by Name (main)")

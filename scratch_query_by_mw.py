import paramiko

HOST = '177.39.17.7'
USER = 'root'
PASS = '6EFBC!c0:wzr%Ij'
MW_CONTAINER = 'dashboard-middleware-irerzifjwjb4q8ucbpfk2gb8-005649123523'

def run_cmd(label, cmd):
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        client.connect(HOST, username=USER, password=PASS)
        _, stdout, stderr = client.exec_command(cmd)
        out = stdout.read().decode('utf-8')
        err = stderr.read().decode('utf-8')
        print(f"\n=== {label} ===")
        print(out or "(sem resultado)")
        if err.strip():
            print("ERR:", err)
    except Exception as e:
        print(f"[ERRO] {label}: {e}")
    finally:
        client.close()

# Run a node script inside the middleware container to query its active database
node_script = (
    "const db = require('./src/db/postgres');"
    "db.dbContext.run({ dbType: 'vet' }, async () => {"
    "  try {"
    "    const r1 = await db.query('SELECT COUNT(*) FROM dash_vendas WHERE tenant_id = \\'3edd56b4-e002-48ed-8ecb-131c0c62dcfb\\'');"
    "    console.log('Vendas count (vet): ' + r1.rows[0].count);"
    "    const r2 = await db.query('SELECT COUNT(*) FROM dash_sync_metadata WHERE tenant_id = \\'3edd56b4-e002-48ed-8ecb-131c0c62dcfb\\'');"
    "    console.log('Metadata count (vet): ' + r2.rows[0].count);"
    "    const r3 = await db.query('SELECT email FROM dash_usuarios WHERE tenant_id = \\'3edd56b4-e002-48ed-8ecb-131c0c62dcfb\\'');"
    "    console.log('Users (vet): ' + JSON.stringify(r3.rows));"
    "  } catch(e) {"
    "    console.error('ERR: ' + e.message);"
    "  }"
    "  process.exit(0);"
    "});"
)

run_cmd(
    "QUERY VIA MIDDLEWARE (VET DB)",
    f'docker exec {MW_CONTAINER} node -e "{node_script}"'
)

# Also run with dbType: 'main' just in case
node_script_main = (
    "const db = require('./src/db/postgres');"
    "db.dbContext.run({ dbType: 'main' }, async () => {"
    "  try {"
    "    const r1 = await db.query('SELECT COUNT(*) FROM dash_vendas WHERE tenant_id = \\'3edd56b4-e002-48ed-8ecb-131c0c62dcfb\\'');"
    "    console.log('Vendas count (main): ' + r1.rows[0].count);"
    "    const r2 = await db.query('SELECT COUNT(*) FROM dash_sync_metadata WHERE tenant_id = \\'3edd56b4-e002-48ed-8ecb-131c0c62dcfb\\'');"
    "    console.log('Metadata count (main): ' + r2.rows[0].count);"
    "  } catch(e) {"
    "    console.error('ERR: ' + e.message);"
    "  }"
    "  process.exit(0);"
    "});"
)

run_cmd(
    "QUERY VIA MIDDLEWARE (MAIN DB)",
    f'docker exec {MW_CONTAINER} node -e "{node_script_main}"'
)

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

node_script = (
    "const db = require('./src/db/postgres');"
    "db.dbContext.run({ dbType: 'main' }, async () => {"
    "  try {"
    "    const r = await db.query('SELECT DISTINCT tenant_id::text FROM dash_vendas');"
    "    console.log('Distinct tenants: ' + JSON.stringify(r.rows.map(x => x.tenant_id)));"
    "  } catch(e) {"
    "    console.error('ERR: ' + e.message);"
    "  }"
    "  process.exit(0);"
    "});"
)

run_cmd(
    "TENANTS FROM MIDDLEWARE CONTEXT",
    f'docker exec {MW_CONTAINER} node -e "{node_script}"'
)

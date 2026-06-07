import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('177.39.17.7', username='root', password='6EFBC!c0:wzr%Ij')

# Get the container ID of the running dashboard-middleware
stdin, stdout, stderr = client.exec_command("docker ps -q --filter name=dashboard-middleware | head -n 1")
container_id = stdout.read().decode('utf-8').strip()

print(f"Middleware container: {container_id}")

node_script = (
    "const db = require('./src/db/postgres');"
    "db.dbContext.run({ dbType: 'main' }, async () => {"
    "  try {"
    "    const r = await db.query('SELECT COUNT(*), MAX(data_venda) FROM dash_vendas');"
    "    console.log('Main DB: ' + JSON.stringify(r.rows));"
    "  } catch(e) {"
    "    console.error('Main DB ERR: ' + e.message);"
    "  }"
    "});"
    "db.dbContext.run({ dbType: 'vet' }, async () => {"
    "  try {"
    "    const r = await db.query('SELECT COUNT(*), MAX(data_venda) FROM dash_vendas');"
    "    console.log('Vet DB: ' + JSON.stringify(r.rows));"
    "  } catch(e) {"
    "    console.error('Vet DB ERR: ' + e.message);"
    "  }"
    "  setTimeout(() => process.exit(0), 1000);"
    "});"
)

if container_id:
    stdin, stdout, stderr = client.exec_command(f'docker exec {container_id} node -e "{node_script}"')
    print("=== Execution Output ===")
    print(stdout.read().decode('utf-8'))
    print(stderr.read().decode('utf-8'))
else:
    print("No container found.")

client.close()

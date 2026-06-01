import paramiko, json

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('177.39.17.7', username='root', password='6EFBC!c0:wzr%Ij')

stdin, stdout, stderr = client.exec_command("docker ps --format '{{.Names}}' | grep 'dashboard-middleware'")
MW = stdout.read().decode('utf-8').strip()
print(f"Container middleware: {MW}")

script = (
    "const db = require('./src/db/postgres');"
    "db.poolMain.query('SELECT 1 AS ok').then(r => {"
    "  console.log('Main DB Pool OK');"
    "  return db.poolVet.query('SELECT 1 AS ok');"
    "}).then(r => {"
    "  console.log('Vet DB Pool OK');"
    "  process.exit(0);"
    "}).catch(e => {"
    "  console.error('POOL ERROR:', e.stack);"
    "  process.exit(1);"
    "});"
)

cmd = f"docker exec {MW} node -e \"{script}\" 2>&1"
stdin, stdout, stderr = client.exec_command(cmd)
result = stdout.read().decode('utf-8')
print("=== Output ===")
print(result)

client.close()

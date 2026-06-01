import paramiko, json

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('177.39.17.7', username='root', password='6EFBC!c0:wzr%Ij')

stdin, stdout, stderr = client.exec_command("docker ps --format '{{.Names}}' | grep 'dashboard-middleware'")
MW = stdout.read().decode('utf-8').strip()
print(f"Container middleware: {MW}")

script = (
    "const {Pool}=require('pg');"
    "const p=new Pool({"
    "host:process.env.PG_HOST||'localhost',"
    "user:process.env.PG_USER||'coliseu_admin',"
    "password:process.env.PG_PASSWORD||'ColiseuDB2026Prod',"
    "database:process.env.PG_DATABASE||'coliseu_dashboard',"
    "port:parseInt(process.env.PG_PORT||5432)"
    "});"
    "p.query('SELECT id, email, tenant_id, layout_version, use_vet_db FROM dash_usuarios').then(r=>{"
    "  console.log('USERS:', JSON.stringify(r.rows));"
    "  p.end();"
    "}).catch(e=>{"
    "  console.error('ERROR:', e.message);"
    "  p.end();"
    "});"
)

cmd = f"docker exec {MW} node -e \"{script}\" 2>&1"
stdin, stdout, stderr = client.exec_command(cmd)
result = stdout.read().decode('utf-8')
print("=== Output ===")
print(result)

client.close()

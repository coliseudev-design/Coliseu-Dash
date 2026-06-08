import paramiko, json

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('177.39.17.7', username='root', password='6EFBC!c0:wzr%Ij')

MW = "api-nsnopymisrq9qphl5qjc3w5l-135847967979"
print(f"Container other middleware: {MW}")

script = (
    "const {Pool}=require('pg');"
    "const p=new Pool({"
    "  host: process.env.PG_HOST,"
    "  user: process.env.PG_USER,"
    "  password: process.env.PG_PASSWORD,"
    "  database: process.env.PG_DATABASE,"
    "  port: parseInt(process.env.PG_PORT||5432)"
    "});"
    "p.query('SELECT id, tenant_id, email, nome, role, ativo, layout_version FROM dash_usuarios').then(r=>{"
    "  console.log('USERS:' + JSON.stringify(r.rows));"
    "  return p.end();"
    "}).catch(e=>{console.error(e); p.end();});"
)

cmd = f"docker exec {MW} node -e \"{script}\""
stdin, stdout, stderr = client.exec_command(cmd)
print("STDOUT:")
print(stdout.read().decode('utf-8'))
print("STDERR:")
print(stderr.read().decode('utf-8'))
client.close()

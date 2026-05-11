import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('177.39.17.7', username='root', password='6EFBC!c0:wzr%Ij')

# Todos containers, inclusive parados
stdin, stdout, stderr = client.exec_command("docker ps -a --format '{{.Names}}\t{{.Image}}\t{{.Status}}'")
all_c = stdout.read().decode('utf-8')
print("=== Todos containers ===")
for line in all_c.splitlines():
    if any(k in line.lower() for k in ['postgres', 'pg', 'coliseu', 'dash', 'db']):
        print(" ", line)

print()

# Tenta via middleware exec - usa o node para fazer query
cmd = """docker exec dashboard-middleware-irerzifjwjb4q8ucbpfk2gb8-143954252857 node -e "
const { Pool } = require('pg');
const pool = new Pool({host:'coliseu-db',user:'coliseu_admin',password:'ColiseuDB2026Prod',database:'coliseu_dashboard',port:5432});
pool.query(\\"SELECT id_firebird, data_venda, valor_total, status FROM dash_vendas WHERE data_venda >= CURRENT_DATE - 1 ORDER BY id_firebird DESC LIMIT 10\\").then(r=>{console.log(JSON.stringify(r.rows));pool.end()}).catch(e=>{console.error(e.message);pool.end()});
" 2>&1"""
stdin, stdout, stderr = client.exec_command(cmd)
print("=== Query via middleware node ===")
print(stdout.read().decode('utf-8'))

client.close()

import paramiko
import json

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('177.39.17.7', username='root', password='6EFBC!c0:wzr%Ij')

# Find MW container name
stdin, stdout, stderr = client.exec_command("docker ps --format '{{.Names}}' | grep 'dashboard-middleware'")
MW = stdout.read().decode('utf-8').strip()
print(f"Middleware container: {MW}")

def run_query(sql):
    script = (
        "const {Pool}=require('pg');"
        "const p=new Pool({host:'coliseu-db',user:'coliseu_admin',password:'ColiseuDB2026Prod',database:'coliseu_dashboard',port:5432});"
        f"p.query({json.dumps(sql)}).then(r=>{{console.log(JSON.stringify(r.rows));p.end();}}).catch(e=>{{console.error(e.message);p.end();}});"
    )
    cmd = f"docker exec {MW} node -e \"{script}\" 2>&1"
    stdin, stdout, stderr = client.exec_command(cmd)
    return stdout.read().decode('utf-8').strip()

# 1. Inspect count and sum of dash_vendas in Dec 2025
print("=== Group by Status ===")
sql_status = """
SELECT status, COUNT(*), SUM(valor_total) as total
FROM dash_vendas
WHERE data_venda >= '2025-12-01 00:00:00' AND data_venda <= '2025-12-31 23:59:59'
GROUP BY status
ORDER BY total DESC;
"""
print(run_query(sql_status))

print("=== Group by nature_operacao / CFOP (top 20) ===")
sql_cfop = """
SELECT natureza_operacao, COUNT(*), SUM(valor_total) as total
FROM dash_vendas
WHERE data_venda >= '2025-12-01 00:00:00' AND data_venda <= '2025-12-31 23:59:59'
GROUP BY natureza_operacao
ORDER BY total DESC
LIMIT 20;
"""
print(run_query(sql_cfop))

client.close()

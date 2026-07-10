import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('2.24.82.19', username='root', password='Col@13894645')

db_container = 'vasjsucz4yxcb7m4rtqindd2'

def run_query(db_name, sql):
    sql_escaped = sql.replace("'", "'\\''")
    cmd = f"docker exec {db_container} psql -U coliseu_admin -d {db_name} -c '{sql_escaped}' 2>&1"
    stdin, stdout, stderr = client.exec_command(cmd)
    out = stdout.read().decode('utf-8')
    return out

tenant_id = 'db05d98f-6939-4d80-af33-54cd91c35d7f'

print("=== CHECKING DEVOLUCAO DE CLIENTE VALUES IN dash_vendas ===")
sql = f"""
SELECT 
    id_firebird,
    especie,
    valor_total,
    valor_desconto,
    status
FROM dash_vendas 
WHERE tenant_id = '{tenant_id}' AND especie = 'DEVOLUCAO DE CLIENTE'
LIMIT 5
"""
print(run_query("coliseu_dashboard", sql))

print("=== SUM OF DEVOLUCAO DE CLIENTE ===")
sql = f"""
SELECT 
    SUM(valor_total) AS sum_total,
    SUM(valor_total - COALESCE(valor_desconto, 0)) AS sum_net
FROM dash_vendas 
WHERE tenant_id = '{tenant_id}' AND especie = 'DEVOLUCAO DE CLIENTE'
"""
print(run_query("coliseu_dashboard", sql))

client.close()

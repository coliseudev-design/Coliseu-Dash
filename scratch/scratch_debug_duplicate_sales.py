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

print("=== 1. COUNT SALES VS UNIQUE ID_FIREBIRD ===")
sql = f"""
SELECT count(*), count(distinct id_firebird) 
FROM dash_vendas 
WHERE tenant_id = '{tenant_id}'
"""
print(run_query("coliseu_dashboard", sql))

print("=== 2. COUNT SALES ITEMS VS UNIQUE ID_FIREBIRD ===")
sql = f"""
SELECT count(*), count(distinct venda_id_firebird) 
FROM dash_vendas_itens 
WHERE tenant_id = '{tenant_id}'
"""
print(run_query("coliseu_dashboard", sql))

print("=== 3. EXAMPLE OF DUPLICATE ID_FIREBIRD IN dash_vendas ===")
sql = f"""
SELECT id_firebird, count(*) 
FROM dash_vendas 
WHERE tenant_id = '{tenant_id}' 
GROUP BY 1 
HAVING count(*) > 1 
LIMIT 10
"""
print(run_query("coliseu_dashboard", sql))

client.close()

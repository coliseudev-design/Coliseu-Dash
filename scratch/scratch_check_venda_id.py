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

print("=== CHECK venda_id_firebird IN dash_financeiro ===")
sql = f"""
SELECT 
    COUNT(*), 
    COUNT(venda_id_firebird) as count_not_null,
    COUNT(CASE WHEN venda_id_firebird IS NOT NULL THEN 1 END) as count_venda_id
FROM dash_financeiro 
WHERE tenant_id = '{tenant_id}'
"""
print(run_query("coliseu_dashboard", sql))

client.close()

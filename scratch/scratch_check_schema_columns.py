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

print("=== COLUMNS FOR dash_vendas ===")
sql_vendas = """
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'dash_vendas'
ORDER BY ordinal_position
"""
print(run_query("coliseu_dashboard", sql_vendas))

print("=== COLUMNS FOR dash_vendas_itens ===")
sql_itens = """
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'dash_vendas_itens'
ORDER BY ordinal_position
"""
print(run_query("coliseu_dashboard", sql_itens))

client.close()

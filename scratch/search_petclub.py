import paramiko
client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('177.39.17.7', username='root', password='6EFBC!c0:wzr%Ij')

def run_query(sql, db="coliseu_dashboard"):
    sql_escaped = sql.replace("'", "'\\''")
    cmd = f"docker exec coliseu-db-thyqkc5gkvp7i1nld555wakz-172547374937 psql -U coliseu_admin -d {db} -c '{sql_escaped}'"
    stdin, stdout, stderr = client.exec_command(cmd)
    print(f"=== {sql[:50]} ===")
    print(stdout.read().decode('utf-8'))

# Search for "PETCLUB" in dash_filiais
run_query("SELECT * FROM dash_filiais WHERE nome ILIKE '%PETCLUB%' OR empresa_erp ILIKE '%PETCLUB%'")
# Search for any sales with "PETCLUB" in depto_id or other fields
run_query("SELECT tenant_id, COUNT(*) FROM dash_vendas GROUP BY tenant_id")
# Search for "PETCLUB" in dash_vendas
run_query("SELECT distinct tenant_id FROM dash_filiais WHERE nome ILIKE '%PETCLUB%'")
# Search for the UUID in any table
run_query("SELECT * FROM dash_usuarios WHERE id_firebird = 5 OR tenant_id = '816f97c4-66fb-4ef8-905d-e0551cbf2492' OR email ILIKE '%petclub%'")

client.close()

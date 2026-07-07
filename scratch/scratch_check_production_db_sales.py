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

tenant_id = 'ba7a5f04-a525-45fd-bacc-8011ed9486a1'

print("=== companies ===")
print(run_query("coliseu_identity", f'SELECT "Id", "Name" FROM companies WHERE "Id" = \'{tenant_id}\''))

print("=== branches in coliseu_identity ===")
print(run_query("coliseu_identity", f'SELECT "Id", "Name", "CompanyId", "ErpDeptoPadrao" FROM branches WHERE "CompanyId" = \'{tenant_id}\''))

client.close()

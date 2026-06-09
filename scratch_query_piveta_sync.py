import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('2.24.82.19', username='root', password='Col@13894645', timeout=10)

def run_sql(db, sql):
    cmd = f"docker exec -i vasjsucz4yxcb7m4rtqindd2 psql -U coliseu_admin -d {db}"
    stdin, stdout, stderr = client.exec_command(cmd)
    stdin.write(sql)
    stdin.close()
    
    out = stdout.read().decode('utf-8')
    err = stderr.read().decode('utf-8')
    print(f"=== DB: {db} ===")
    if out:
        print(out)
    if err:
        print("ERR:", err)

# Check all sync metadata fields for Piveta
run_sql("coliseu_dashboard", "SELECT * FROM dash_sync_metadata WHERE tenant_id = '1e40d65f-4319-4c68-ae13-66223820c095' ORDER BY tabela;\n")

client.close()

import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('2.24.82.19', username='root', password='Col@13894645')

db_container = 'vasjsucz4yxcb7m4rtqindd2'

def run_query(sql, label):
    cmd = f'docker exec -i {db_container} psql -U coliseu_admin -d coliseu_dashboard -c "{sql}"'
    stdin, stdout, stderr = client.exec_command(cmd)
    print(f"=== {label} ===")
    print(stdout.read().decode('utf-8'))

tenant_id = '1ca30f62-4487-4103-b529-c6d7b041b245'
run_query(f"SELECT * FROM dash_sync_metadata WHERE tenant_id = '{tenant_id}';", "Sync Metadata for Active Tenant")
client.close()

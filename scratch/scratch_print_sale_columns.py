import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('2.24.82.19', username='root', password='Col@13894645', timeout=10)

def run_query(label, sql):
    cmd = f'docker exec vasjsucz4yxcb7m4rtqindd2 psql -U coliseu_admin -d coliseu_dashboard -c "{sql}"'
    stdin, stdout, stderr = client.exec_command(cmd)
    print(f"\n=== {label} ===")
    print(stdout.read().decode('utf-8'))

# Print columns and values of a sale where id_firebird is 513672 (Mylena)
run_query(
    "Sale details for Mylena",
    "SELECT * FROM dash_vendas WHERE tenant_id = '816f97c4-66fb-4ef8-905d-e0551cbf2942' AND id_firebird = 513672;"
)

client.close()

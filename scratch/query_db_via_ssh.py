import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('177.39.17.7', username='root', password='6EFBC!c0:wzr%Ij')

DB_CONTAINER = "coliseu-db-thyqkc5gkvp7i1nld555wakz-172547374937"

def run_psql(db, sql):
    cmd = f"docker exec {DB_CONTAINER} psql -U coliseu_admin -d {db} -c '{sql}'"
    stdin, stdout, stderr = client.exec_command(cmd)
    return stdout.read().decode('utf-8')

print("=== All Sales Total count/sum by Tenant ===")
print(run_psql("coliseu_dashboard", "SELECT tenant_id, COUNT(*), SUM(valor_total) FROM dash_vendas GROUP BY tenant_id;"))

client.close()

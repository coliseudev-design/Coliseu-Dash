import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('177.39.17.7', username='root', password='6EFBC!c0:wzr%Ij')

DB = "coliseu-db-thyqkc5gkvp7i1nld555wakz-172547374937"

def pg(sql, label):
    sql_escaped = sql.replace('"', '\\"')
    cmd = f'docker exec {DB} psql -U coliseu_admin -d coliseu_dashboard -c "{sql_escaped}" 2>&1'
    stdin, stdout, stderr = client.exec_command(cmd)
    print(f"\n=== {label} ===")
    print(stdout.read().decode('utf-8'))

pg(
    "SELECT tenant_id, COUNT(*), MIN(data_venda) as min_date, MAX(data_venda) as max_date FROM dash_vendas GROUP BY tenant_id;",
    "Contagem de vendas por Tenant"
)

client.close()

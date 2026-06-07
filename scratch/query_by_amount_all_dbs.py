import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('177.39.17.7', username='root', password='6EFBC!c0:wzr%Ij')

DB_CONTAINER = "coliseu-db-thyqkc5gkvp7i1nld555wakz-172547374937"

def run_query(db, sql, label):
    cmd = f'docker exec {DB_CONTAINER} psql -U coliseu_admin -d {db} -c "{sql}"'
    stdin, stdout, stderr = client.exec_command(cmd)
    print(f"=== {label} (DB: {db}) ===")
    print(stdout.read().decode('utf-8'))

for db in ["coliseu_dashboard", "coliseu_dashboard_vet", "postgres"]:
    run_query(db, "SELECT * FROM dash_vendas WHERE valor_total = 150.00 ORDER BY data_venda DESC LIMIT 5;", "Sales with 150.00")
    run_query(db, "SELECT * FROM dash_vendas WHERE valor_total = 99.90 ORDER BY data_venda DESC LIMIT 5;", "Sales with 99.90")

client.close()

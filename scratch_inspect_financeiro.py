import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('177.39.17.7', username='root', password='6EFBC!c0:wzr%Ij')

DB_CONTAINER = "coliseu-db-thyqkc5gkvp7i1nld555wakz-172547374937"

def run_query(sql, label):
    cmd = f'docker exec {DB_CONTAINER} psql -U coliseu_admin -d coliseu_dashboard -c "{sql}"'
    stdin, stdout, stderr = client.exec_command(cmd)
    print(f"=== {label} ===")
    print(stdout.read().decode('utf-8'))

# Count of financeiro by month in 2026
run_query("SELECT EXTRACT(MONTH FROM data_vencimento) as mes_venc, COUNT(*), MIN(data_vencimento), MAX(data_vencimento) FROM dash_financeiro WHERE data_vencimento >= '2026-01-01' GROUP BY 1 ORDER BY 1;", "Financeiro by vencimento month in 2026")

# Count of financeiro by emission month in 2026
run_query("SELECT EXTRACT(MONTH FROM data_emissao) as mes_emissao, COUNT(*), MIN(data_emissao), MAX(data_emissao) FROM dash_financeiro WHERE data_emissao >= '2026-01-01' GROUP BY 1 ORDER BY 1;", "Financeiro by emissao month in 2026")

client.close()

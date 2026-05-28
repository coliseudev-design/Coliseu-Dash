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

run_query("""
    SELECT 
        CASE WHEN cfop IS NULL THEN 'NULL' ELSE 'NOT NULL' END as cfop_status,
        COUNT(*),
        MIN(data_venda)::text as min_date,
        MAX(data_venda)::text as max_date
    FROM dash_vendas 
    WHERE tenant_id = 'ed1d3a98-4c4d-48db-99c0-8751926eb8e5'
    GROUP BY 1;
""", "CFOP nullness for ed1d3a98 in dash_vendas")

run_query("""
    SELECT DISTINCT cfop, COUNT(*) 
    FROM dash_vendas 
    WHERE tenant_id = 'ed1d3a98-4c4d-48db-99c0-8751926eb8e5' AND cfop IS NOT NULL
    GROUP BY cfop;
""", "Distinct non-null CFOPs for ed1d3a98")

client.close()

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

# Search for companies and users
run_query("SELECT id, nome, razao_social, cnpj FROM dash_empresas;", "dash_empresas")
run_query("SELECT id, nome, email, tenant_id, layout_version FROM dash_usuarios;", "dash_usuarios")
run_query("""
    SELECT tenant_id, cfop, COUNT(*), SUM(valor_total) 
    FROM dash_vendas 
    WHERE data_venda >= '2025-12-01' AND data_venda <= '2025-12-31' 
    GROUP BY tenant_id, cfop;
""", "Sales by Tenant and CFOP in Dec 2025")
run_query("""
    SELECT tenant_id, status, COUNT(*), SUM(valor_total) 
    FROM dash_vendas 
    WHERE data_venda >= '2025-12-01' AND data_venda <= '2025-12-31' 
    GROUP BY tenant_id, status;
""", "Sales by Tenant and Status in Dec 2025")
run_query("SELECT COUNT(*) FROM dash_devolucoes;", "dash_devolucoes row count")
client.close()

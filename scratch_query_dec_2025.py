import paramiko

def run_query(sql):
    host = '177.39.17.7'
    user = 'root'
    password = '6EFBC!c0:wzr%Ij'
    container = 'coliseu-db-thyqkc5gkvp7i1nld555wakz-172547374937'
    
    # We escape double quotes and single quotes carefully
    cmd = f'docker exec {container} psql -U coliseu_admin -d coliseu_dashboard -c "{sql}"'
    
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        client.connect(host, username=user, password=password)
        stdin, stdout, stderr = client.exec_command(cmd)
        out = stdout.read().decode('utf-8')
        err = stderr.read().decode('utf-8')
        print(f"--- QUERY: {sql[:100]} ---")
        print(out)
        if err:
            print("ERR:")
            print(err)
    except Exception as e:
        print(f"Error: {e}")
    finally:
        client.close()

# 1. Tenant info
run_query("SELECT DISTINCT tenant_id FROM dash_vendas;")

# 2. Vendas grouped by tenant, status in Dec 2025
run_query("""
    SELECT tenant_id, status, COUNT(*), SUM(valor_total) 
    FROM dash_vendas 
    WHERE data_venda >= '2025-12-01' AND data_venda < '2026-01-01' 
    GROUP BY tenant_id, status;
""")

# 3. Devolucoes count and sum in Dec 2025
run_query("SELECT COUNT(*), SUM(valor) FROM dash_devolucoes;")
run_query("SELECT * FROM dash_devolucoes LIMIT 5;")

# 4. Check if there are other databases or tables
run_query("\dt")

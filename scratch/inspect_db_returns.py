import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())

try:
    client.connect('2.24.82.19', username='root', password='Col@13894645', timeout=10)
    
    # We want to run psql queries against the pg container: vasjsucz4yxcb7m4rtqindd2
    container = "vasjsucz4yxcb7m4rtqindd2"
    
    def run_query(sql, title):
        cmd = f'docker exec {container} psql -U coliseu_admin -d coliseu_dashboard -c "{sql}"'
        stdin, stdout, stderr = client.exec_command(cmd)
        print(f"=== {title} ===")
        print(stdout.read().decode('utf-8'))
        err = stderr.read().decode('utf-8')
        if err:
            print("ERR:", err)
            
    # Check dash_vendas columns
    run_query(
        "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'dash_vendas';",
        "dash_vendas Columns"
    )
    
    # Check the counts of devolucoes by tenant/especie/status/es/processo if they exist
    run_query(
        "SELECT tenant_id, especie, TRIM(status) as status, COUNT(*), SUM(valor_total) FROM dash_vendas WHERE especie ILIKE '%DEVOLUCAO%' GROUP BY tenant_id, especie, TRIM(status);",
        "Devolucao species in dash_vendas"
    )
    
    # Let's see if any columns like 'es', 'processo', or 'tipo' already exist in dash_vendas
    run_query(
        "SELECT column_name FROM information_schema.columns WHERE table_name = 'dash_vendas' AND column_name IN ('es', 'processo', 'tipo');",
        "Existing return fields in dash_vendas"
    )

except Exception as e:
    print("Error:", e)
finally:
    client.close()

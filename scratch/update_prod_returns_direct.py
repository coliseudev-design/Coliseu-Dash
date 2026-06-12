import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())

try:
    client.connect('2.24.82.19', username='root', password='Col@13894645', timeout=10)
    
    container = "vasjsucz4yxcb7m4rtqindd2"
    
    def run_query(sql, title):
        cmd = f'docker exec {container} psql -U coliseu_admin -d coliseu_dashboard -c "{sql}"'
        stdin, stdout, stderr = client.exec_command(cmd)
        print(f"=== {title} ===")
        print(stdout.read().decode('utf-8'))
        err = stderr.read().decode('utf-8')
        if err:
            print("ERR:", err)
            
    # Find tenant_id
    run_query(
        "SELECT DISTINCT tenant_id FROM dash_vendas WHERE id_firebird IN (20194, 20196);",
        "Finding Tenant ID"
    )
    
    # Update return 20194 and 20196 for all matching tenants
    run_query(
        "UPDATE dash_vendas SET es = 2, processo = 2, valor_total = -137.40 WHERE id_firebird = 20194;",
        "Updating 20194"
    )
    
    run_query(
        "UPDATE dash_vendas SET es = 2, processo = 2, valor_total = -148.00 WHERE id_firebird = 20196;",
        "Updating 20196"
    )
    
    # Refresh Materialized View
    run_query(
        "REFRESH MATERIALIZED VIEW mv_dash_vendas_diario;",
        "Refreshing Materialized View"
    )
    
    # Verify the updated rows
    run_query(
        "SELECT tenant_id, id_firebird, numero_pedido, valor_total, es, processo FROM dash_vendas WHERE id_firebird IN (20194, 20196);",
        "Verifying Updates"
    )

except Exception as e:
    print("Error:", e)
finally:
    client.close()

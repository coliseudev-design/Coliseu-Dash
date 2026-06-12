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
            
    # Check these orders
    run_query(
        "SELECT id_firebird, numero_pedido, valor_total, valor_desconto, status, especie FROM dash_vendas WHERE id_firebird IN (20194, 20196) OR numero_pedido IN ('20194', '20196');",
        "Inspecting returns 20194 and 20196"
    )

except Exception as e:
    print("Error:", e)
finally:
    client.close()

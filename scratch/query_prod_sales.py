import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
try:
    print("Connecting to production 2.24.82.19...")
    client.connect('2.24.82.19', username='root', password='6EFBC!c0:wzr%Ij')
    print("Success!")
    
    # 1. Encontrar o container de banco de dados no Production
    stdin, stdout, stderr = client.exec_command("docker ps -a --filter name=db --format '{{.Names}}'")
    db_containers = stdout.read().decode('utf-8').strip().split('\n')
    print("DB Containers:", db_containers)
    
    # Vamos usar o primeiro container de banco de dados
    if db_containers and db_containers[0]:
        db_container = db_containers[0]
        # Query the database
        sql = "SELECT tenant_id, id_firebird, numero_pedido, data_venda, data_vencimento, valor_total, status, cfop FROM dash_vendas WHERE numero_pedido = '228914' OR valor_total = 259.90;"
        sql_escaped = sql.replace('"', '\\"')
        cmd = f'docker exec {db_container} psql -U coliseu_admin -d coliseu_dashboard -c "{sql_escaped}"'
        stdin, stdout, stderr = client.exec_command(cmd)
        print("=== Query Result on Production ===")
        print(stdout.read().decode('utf-8'))
        print(stderr.read().decode('utf-8'))
except Exception as e:
    print(f"Error: {e}")
finally:
    client.close()

import paramiko

HOST = '177.39.17.7'
USER = 'root'
PASS = '6EFBC!c0:wzr%Ij'

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
try:
    print(f"Connecting to staging {HOST} via SSH...")
    client.connect(HOST, username=USER, password=PASS, timeout=10)
    print("SSH connection succeeded!")
    
    # Encontrar container db
    stdin, stdout, stderr = client.exec_command("docker ps --filter name=db --format '{{.Names}}'")
    db_containers = stdout.read().decode('utf-8').strip().split('\n')
    print("DB Containers:", db_containers)
    
    db_container = db_containers[0] if db_containers and db_containers[0] else None
    if db_container:
        print(f"Using DB Container: {db_container}")
        
        # Query pedido
        sql = "SELECT id_firebird, numero_pedido, data_venda, data_vencimento, valor_total, status, cfop, sincronizado_em FROM dash_vendas WHERE numero_pedido = '229124' OR id_firebird = 513034"
        sql_escaped = sql.replace('"', '\\"')
        cmd = f'docker exec {db_container} psql -U coliseu_admin -d coliseu_dashboard -c "{sql_escaped}"'
        stdin, stdout, stderr = client.exec_command(cmd)
        print("=== Hugo's Order in dash_vendas ===")
        print(stdout.read().decode('utf-8'))
        print(stderr.read().decode('utf-8'))
        
        # Query items
        sql_itens = "SELECT id_firebird, venda_id_firebird, produto, quantidade, preco_unitario, valor_total FROM dash_vendas_itens WHERE venda_id_firebird = 513034"
        sql_itens_escaped = sql_itens.replace('"', '\\"')
        cmd_itens = f'docker exec {db_container} psql -U coliseu_admin -d coliseu_dashboard -c "{sql_itens_escaped}"'
        stdin, stdout, stderr = client.exec_command(cmd_itens)
        print("=== Hugo's Order Items ===")
        print(stdout.read().decode('utf-8'))
        
    else:
        print("No DB container found.")
        
except Exception as e:
    print("Error:", e)
finally:
    client.close()

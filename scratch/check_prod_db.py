import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
try:
    client.connect('177.39.17.7', username='root', password='6EFBC!c0:wzr%Ij', timeout=10)
    print("SSH conectado com sucesso!")

    # 1. Containers
    stdin, stdout, stderr = client.exec_command('docker ps --filter name=coliseu-db --format "{{.Names}}"')
    db_containers = stdout.read().decode().strip().split('\n')
    print('DB Containers:', db_containers)

    container = db_containers[0]
    
    # 2. Migração para garantir a coluna desconto_item no PostgreSQL
    print("\n--- Aplicando/Garantindo coluna desconto_item no PostgreSQL ---")
    mig_cmd = f'docker exec {container} psql -U coliseu_admin -d coliseu_dashboard -c "ALTER TABLE dash_vendas_itens ADD COLUMN IF NOT EXISTS desconto_item DECIMAL(10,2) DEFAULT 0;"'
    stdin, stdout, stderr = client.exec_command(mig_cmd)
    print(stdout.read().decode())
    print(stderr.read().decode())

    # 3. Verificar tenants
    print("\n--- Tenants no banco ---")
    t_cmd = f'docker exec {container} psql -U coliseu_admin -d coliseu_dashboard -c "SELECT id, nome FROM dash_tenants LIMIT 10;"'
    stdin, stdout, stderr = client.exec_command(t_cmd)
    print(stdout.read().decode())

    # 4. Verificar amostra de EUCALIPTO
    print("\n--- Amostra de EUCALIPTO em dash_vendas_itens ---")
    e_cmd = f"docker exec {container} psql -U coliseu_admin -d coliseu_dashboard -c \"SELECT venda_id_firebird, produto, valor_total, desconto_item FROM dash_vendas_itens WHERE produto LIKE '%EUCALIPTO%' ORDER BY id DESC LIMIT 5;\""
    stdin, stdout, stderr = client.exec_command(e_cmd)
    print(stdout.read().decode())

    # 5. Quantos itens tem desconto_item > 0 vs = 0?
    print("\n--- Contagem desconto_item ---")
    c_cmd = f"docker exec {container} psql -U coliseu_admin -d coliseu_dashboard -c \"SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE desconto_item > 0) AS com_desconto, COUNT(*) FILTER (WHERE desconto_item = 0 OR desconto_item IS NULL) AS sem_desconto FROM dash_vendas_itens;\""
    stdin, stdout, stderr = client.exec_command(c_cmd)
    print(stdout.read().decode())

    client.close()
except Exception as ex:
    print(f"Erro SSH: {ex}")

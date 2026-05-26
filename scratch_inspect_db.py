import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('177.39.17.7', username='root', password='6EFBC!c0:wzr%Ij')

# 1. Search for ID 490086 in dash_vendas
cmd1 = """docker exec $(docker ps -q --filter name=db | head -1) psql -U coliseu_admin -d coliseu_dashboard -c "
SELECT * FROM dash_vendas WHERE id_firebird = 490086;
" """
stdin, stdout, stderr = client.exec_command(cmd1)
print("=== ID 490086 IN dash_vendas ===")
print(stdout.read().decode('utf-8'))

# 2. Search for any sales of client 12032 (KLEBER CENTURION SIMOES)
cmd2 = """docker exec $(docker ps -q --filter name=db | head -1) psql -U coliseu_admin -d coliseu_dashboard -c "
SELECT * FROM dash_clientes WHERE nome LIKE '%KLEBER%';
" """
stdin, stdout, stderr = client.exec_command(cmd2)
print("=== CLIENT KLEBER ===")
print(stdout.read().decode('utf-8'))

# 3. Check if there are other sales of client_id_firebird = 12032
cmd3 = """docker exec $(docker ps -q --filter name=db | head -1) psql -U coliseu_admin -d coliseu_dashboard -c "
SELECT id_firebird, numero_pedido, cliente_id_firebird, valor_total, status 
FROM dash_vendas 
WHERE cliente_id_firebird = 12032;
" """
stdin, stdout, stderr = client.exec_command(cmd3)
print("=== SALES OF CLIENT 12032 ===")
print(stdout.read().decode('utf-8'))

client.close()

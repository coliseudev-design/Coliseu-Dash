import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('177.39.17.7', username='root', password='6EFBC!c0:wzr%Ij')

# Query all sales in dash_vendas
query = "SELECT id, tenant_id, id_firebird, numero_pedido, data_venda, valor_total, valor_custo, valor_desconto, status FROM dash_vendas;"
script = f'docker exec coliseu-db-thyqkc5gkvp7i1nld555wakz-172547374937 psql -U coliseu_admin -d coliseu_dashboard -c "{query}"'

stdin, stdout, stderr = client.exec_command(script)
print("=== Query Results ===")
print(stdout.read().decode('utf-8'))
err = stderr.read().decode('utf-8')
if err:
    print("ERR:", err)

client.close()

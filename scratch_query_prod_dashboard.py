import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('2.24.82.19', username='root', password='Col@13894645', timeout=10)

db_container = 'vasjsucz4yxcb7m4rtqindd2'

# Let's run a query for the problematic orders in dash_vendas.
query = "SELECT id_firebird, numero_pedido, tenant_id, data_venda, valor_total, valor_custo, valor_desconto, status FROM dash_vendas WHERE id_firebird IN (18714, 18737) OR numero_pedido IN ('18714', '18737', '6776', '11374');"
cmd = f'docker exec {db_container} psql -U coliseu_admin -d coliseu_dashboard -c "{query}"'

stdin, stdout, stderr = client.exec_command(cmd)
print("=== Query Results in coliseu_dashboard ===")
print(stdout.read().decode('utf-8'))
err = stderr.read().decode('utf-8')
if err:
    print("ERR:", err)

client.close()

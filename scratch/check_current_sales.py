import paramiko
client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('177.39.17.7', username='root', password='6EFBC!c0:wzr%Ij')

cmd = "docker exec coliseu-db-thyqkc5gkvp7i1nld555wakz-172547374937 psql -U coliseu_admin -d coliseu_dashboard -c \"SELECT id_firebird, numero_pedido, data_venda, valor_total, status FROM dash_vendas WHERE tenant_id = '816f97c4-66fb-4ef8-905d-e0551cbf2492' AND data_venda >= '2026-06-01' ORDER BY data_venda\""
stdin, stdout, stderr = client.exec_command(cmd)
print("STDOUT:")
print(stdout.read().decode('utf-8'))
client.close()

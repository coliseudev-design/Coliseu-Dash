import paramiko
client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('177.39.17.7', username='root', password='6EFBC!c0:wzr%Ij')

script = "docker exec coliseu-db-thyqkc5gkvp7i1nld555wakz-131845936540 psql -U coliseu_admin -d coliseu_dashboard -c \"SELECT numero_pedido, valor_total, status, data_venda FROM dash_vendas WHERE data_venda >= '2026-04-27'\""
stdin, stdout, stderr = client.exec_command(script)
print('STDOUT:', stdout.read().decode('utf-8'))
print('STDERR:', stderr.read().decode('utf-8'))

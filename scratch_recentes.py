import paramiko
client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('177.39.17.7', username='root', password='6EFBC!c0:wzr%Ij')
script = "docker exec coliseu-db-thyqkc5gkvp7i1nld555wakz-131845936540 psql -U coliseu_admin -d coliseu_dashboard -c 'SELECT id_firebird, status, data_venda FROM dash_vendas ORDER BY data_venda DESC LIMIT 15;'"
stdin, stdout, stderr = client.exec_command(script)
print(stdout.read().decode('utf-8'))

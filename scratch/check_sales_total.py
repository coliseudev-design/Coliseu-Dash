import paramiko
client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('177.39.17.7', username='root', password='6EFBC!c0:wzr%Ij')

cmd = "docker exec coliseu-db-thyqkc5gkvp7i1nld555wakz-172547374937 psql -U coliseu_admin -d coliseu_dashboard -c \"SELECT tenant_id, COUNT(*), MIN(data_venda), MAX(data_venda) FROM dash_vendas GROUP BY tenant_id\""
stdin, stdout, stderr = client.exec_command(cmd)
print("STDOUT:")
print(stdout.read().decode('utf-8'))
client.close()

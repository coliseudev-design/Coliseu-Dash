import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('177.39.17.7', username='root', password='6EFBC!c0:wzr%Ij')

script = '''
docker exec -i dashboard-middleware-irerzifjwjb4q8ucbpfk2gb8-001928647738 sh -c "PGPASSWORD='ColiseuDB2026Prod' psql -h coliseu-db -p 5432 -U coliseu_admin -d coliseu_dashboard -c \\"SELECT TRIM(status) as status_limpo, TRIM(natureza_operacao) as nat, SUM(valor_total) FROM dash_vendas WHERE data_venda >= '2026-05-11' AND data_venda < '2026-05-12' GROUP BY TRIM(status), TRIM(natureza_operacao);\\""
'''
stdin, stdout, stderr = client.exec_command(script)
print('STDOUT:\n', stdout.read().decode('utf-8'))
print('STDERR:\n', stderr.read().decode('utf-8'))

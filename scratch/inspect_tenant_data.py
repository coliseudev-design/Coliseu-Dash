import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('177.39.17.7', username='root', password='6EFBC!c0:wzr%Ij')

tenant_id = '1ca30f62-4487-4103-b529-c6d7b041b245'
tables = [
    'dash_sync_metadata', 'dash_clientes', 'dash_produtos', 'dash_vendedores', 
    'dash_devolucoes', 'dash_vendas', 'dash_vendas_itens', 'dash_financeiro'
]

sql = ""
for t in tables:
    sql += f"SELECT '{t}' AS tabela, COUNT(*) FROM {t} WHERE tenant_id = '{tenant_id}' UNION ALL\n"
sql = sql[:-11] + ";"

cmd = f'docker exec coliseu-db-thyqkc5gkvp7i1nld555wakz-172547374937 psql -U coliseu_admin -d coliseu_dashboard -c "{sql}"'
stdin, stdout, stderr = client.exec_command(cmd)
print(stdout.read().decode('utf-8'))
client.close()

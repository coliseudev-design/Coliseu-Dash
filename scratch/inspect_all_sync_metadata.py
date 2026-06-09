import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('177.39.17.7', username='root', password='6EFBC!c0:wzr%Ij')

sql = """
SELECT id, tenant_id, tabela, ultima_sincronizacao::text, registros_sincronizados, status, erro_mensagem 
FROM dash_sync_metadata 
ORDER BY ultima_sincronizacao DESC;
"""

script = f'''docker exec -i coliseu-db-thyqkc5gkvp7i1nld555wakz-172547374937 psql -U coliseu_admin -d coliseu_dashboard << 'EOF'
{sql}
EOF
'''

print("Executando listagem completa de metadados...")
stdin, stdout, stderr = client.exec_command(script)
print('STDOUT:')
print(stdout.read().decode('utf-8'))
print('STDERR:')
print(stderr.read().decode('utf-8'))

client.close()

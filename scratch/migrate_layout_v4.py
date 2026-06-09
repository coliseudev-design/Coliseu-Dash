import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('177.39.17.7', username='root', password='6EFBC!c0:wzr%Ij')

sql = """
UPDATE dash_usuarios SET layout_version = 'v1.0' WHERE layout_version = 'v4.0';
"""

# Executa o psql no container do banco de dados de produção
script = f'''docker exec -i coliseu-db-thyqkc5gkvp7i1nld555wakz-172547374937 psql -U coliseu_admin -d coliseu_dashboard << 'EOF'
{sql}
EOF
'''

print("Executando query de migração de layout no banco de dados...")
stdin, stdout, stderr = client.exec_command(script)
print('STDOUT:', stdout.read().decode('utf-8'))
print('STDERR:', stderr.read().decode('utf-8'))

client.close()

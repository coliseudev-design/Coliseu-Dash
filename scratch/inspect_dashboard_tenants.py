import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('177.39.17.7', username='root', password='6EFBC!c0:wzr%Ij')

sql = """
SELECT DISTINCT tenant_id FROM dash_usuarios;
"""

script = f'''docker exec -i coliseu-db-thyqkc5gkvp7i1nld555wakz-172547374937 psql -U coliseu_admin -d coliseu_dashboard << 'EOF'
{sql}
EOF
'''

print("Executando listagem de tenants do dashboard...")
stdin, stdout, stderr = client.exec_command(script)
print(stdout.read().decode('utf-8'))
client.close()

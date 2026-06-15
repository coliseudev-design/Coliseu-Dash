import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('177.39.17.7', username='root', password='6EFBC!c0:wzr%Ij')

sql = """
SELECT "Id", "Name", "Status" FROM companies;
"""

script = f'''docker exec -i coliseu-db-thyqkc5gkvp7i1nld555wakz-172547374937 psql -U coliseu_admin -d coliseu_identity << 'EOF'
{sql}
EOF
'''

print("Executando listagem de companies...")
stdin, stdout, stderr = client.exec_command(script)
output = stdout.read().decode('utf-8')
print(output)
client.close()

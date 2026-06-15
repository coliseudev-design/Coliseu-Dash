import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('177.39.17.7', username='root', password='6EFBC!c0:wzr%Ij')

sql = """
SELECT table_name, column_name, data_type FROM information_schema.columns 
WHERE table_name = 'company_modules' 
ORDER BY ordinal_position;

SELECT * FROM company_modules LIMIT 5;
"""

script = f'''docker exec -i coliseu-db-thyqkc5gkvp7i1nld555wakz-172547374937 psql -U coliseu_admin -d coliseu_identity << 'EOF'
{sql}
EOF
'''

print("Executando inspeção...")
stdin, stdout, stderr = client.exec_command(script)
print('STDOUT:')
print(stdout.read().decode('utf-8'))
client.close()

import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('177.39.17.7', username='root', password='6EFBC!c0:wzr%Ij')

sql = """
-- 1. Contar vendas por tenant_id
SELECT tenant_id, COUNT(*), MIN(data_venda)::text, MAX(data_venda)::text FROM dash_vendas GROUP BY tenant_id;

-- 2. Listar filiais e seus respectivos tenants
SELECT depto_id, tenant_id, nome, documento FROM dash_filiais;

-- 3. Listar metadados do sync
SELECT * FROM dash_sync_metadata;
"""

script = f'''docker exec -i coliseu-db-thyqkc5gkvp7i1nld555wakz-172547374937 psql -U coliseu_admin -d coliseu_dashboard << 'EOF'
{sql}
EOF
'''

print("Executando inspeção de sincronismo e filiais...")
stdin, stdout, stderr = client.exec_command(script)
print('STDOUT:')
print(stdout.read().decode('utf-8'))
print('STDERR:')
print(stderr.read().decode('utf-8'))

client.close()

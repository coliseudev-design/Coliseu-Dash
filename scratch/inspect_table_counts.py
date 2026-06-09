import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('177.39.17.7', username='root', password='6EFBC!c0:wzr%Ij')

tables = [
    'dash_sync_metadata', 'dash_log_atividades', 'dash_clientes', 
    'dash_produtos', 'dash_vendedores', 'dash_fornecedores', 
    'dash_comissoes', 'dash_devolucoes', 'dash_compras', 
    'dash_usuarios', 'dash_auditoria', 'dash_vendas', 
    'dash_caixas', 'dash_vendas_itens', 'dash_filiais', 
    'dash_marcas', 'dash_grupos', 'dash_financeiro', 
    'dash_grupos_acesso', 'dash_permissoes'
]

sql = ""
for t in tables:
    sql += f"SELECT '{t}' AS tabela, COUNT(*) FROM {t} UNION ALL\n"
sql = sql[:-11] + ";" # Remove last UNION ALL

script = f'''docker exec -i coliseu-db-thyqkc5gkvp7i1nld555wakz-172547374937 psql -U coliseu_admin -d coliseu_dashboard << 'EOF'
{sql}
EOF
'''

print("Executando contagem de tabelas...")
stdin, stdout, stderr = client.exec_command(script)
print('STDOUT:')
print(stdout.read().decode('utf-8'))
print('STDERR:')
print(stderr.read().decode('utf-8'))

client.close()

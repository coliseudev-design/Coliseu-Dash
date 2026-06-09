import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('177.39.17.7', username='root', password='6EFBC!c0:wzr%Ij')

sql = """
-- Verificando total de vendas, limites de data e se existem registros
SELECT 
    COUNT(*), 
    MIN(data_venda)::text AS min_data_venda, 
    MAX(data_venda)::text AS max_data_venda,
    MIN(data_vencimento)::text AS min_data_vencimento, 
    MAX(data_vencimento)::text AS max_data_vencimento,
    COUNT(*) FILTER (WHERE data_vencimento IS NULL) AS vencimento_nulls,
    COUNT(*) FILTER (WHERE data_venda IS NULL) AS venda_nulls
FROM dash_vendas;

-- Amostra de vendas recentes e seus status/datas/valores
SELECT 
    id_firebird, 
    tenant_id, 
    data_venda::text, 
    data_vencimento::text, 
    status, 
    valor_total 
FROM dash_vendas 
ORDER BY data_venda DESC 
LIMIT 10;
"""

# Executa o psql no container do banco de dados de produção
script = f'''docker exec -i coliseu-db-thyqkc5gkvp7i1nld555wakz-172547374937 psql -U coliseu_admin -d coliseu_dashboard << 'EOF'
{sql}
EOF
'''

print("Executando inspeção do banco de dados...")
stdin, stdout, stderr = client.exec_command(script)
print('STDOUT:', stdout.read().decode('utf-8'))
print('STDERR:', stderr.read().decode('utf-8'))

client.close()

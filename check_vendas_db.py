import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('177.39.17.7', username='root', password='6EFBC!c0:wzr%Ij')

script = '''
CONTAINER=$(docker ps | grep "postgres" | awk '{print $1}' | head -n 1)
docker exec -i $CONTAINER psql -U postgres -d coliseu_dashboard << 'EOF'
SELECT status, especie, COUNT(*) as qtd, SUM(valor_total) as valor_total
FROM dash_vendas
WHERE data_venda >= '2026-05-11' AND data_venda < '2026-05-12'
GROUP BY status, especie
ORDER BY qtd DESC;
EOF
'''

stdin, stdout, stderr = client.exec_command(script)
print('STDOUT:\n', stdout.read().decode('utf-8'))
print('STDERR:\n', stderr.read().decode('utf-8'))

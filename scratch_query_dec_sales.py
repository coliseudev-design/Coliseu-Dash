import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('2.24.82.19', username='root', password='Col@13894645', timeout=10)

db_container = 'vasjsucz4yxcb7m4rtqindd2'

# Query all sales in Nov and Dec 2025
query = """
    SELECT id_firebird, numero_pedido, data_venda, valor_total, valor_custo, valor_desconto, status 
    FROM dash_vendas 
    WHERE tenant_id = 'ce3067f6-04a3-4b6c-a1b8-6aa47f24aad6'
      AND data_venda >= '2025-11-01' AND data_venda < '2026-01-01'
    ORDER BY data_venda;
"""
cmd = f'docker exec {db_container} psql -U coliseu_admin -d coliseu_dashboard -c "{query}"'

stdin, stdout, stderr = client.exec_command(cmd)
print("=== Nov & Dec 2025 Sales ===")
print(stdout.read().decode('utf-8'))

client.close()

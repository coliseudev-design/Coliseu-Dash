import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('177.39.17.7', username='root', password='6EFBC!c0:wzr%Ij')

DB_CONTAINER = "coliseu-db-thyqkc5gkvp7i1nld555wakz-172547374937"

def run_query(sql, label):
    cmd = f'docker exec {DB_CONTAINER} psql -U coliseu_admin -d coliseu_dashboard -c "{sql}"'
    stdin, stdout, stderr = client.exec_command(cmd)
    print(f"=== {label} ===")
    print(stdout.read().decode('utf-8'))

# Join dash_vendas and dash_clientes on client ID
query = """
SELECT 
    v.id_firebird AS venda_id,
    v.numero_pedido,
    v.data_venda,
    v.data_vencimento,
    v.valor_total,
    v.status,
    c.id_firebird AS cliente_id,
    c.nome AS cliente_nome
FROM dash_vendas v
JOIN dash_clientes c ON v.cliente_id_firebird = c.id_firebird AND v.tenant_id = c.tenant_id
WHERE c.nome ILIKE '%kleber%' OR c.nome ILIKE '%diagone%'
ORDER BY v.data_venda DESC;
"""
run_query(query, "Sales for clients matching KLEBER or DIAGONE")

client.close()

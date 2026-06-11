import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('177.39.17.7', username='root', password='6EFBC!c0:wzr%Ij')

DB = "coliseu-db-thyqkc5gkvp7i1nld555wakz-172547374937"

def pg(sql, label):
    sql_escaped = sql.replace('"', '\\"')
    cmd = f'docker exec {DB} psql -U coliseu_admin -d coliseu_dashboard -c "{sql_escaped}" 2>&1'
    stdin, stdout, stderr = client.exec_command(cmd)
    print(f"\n=== {label} ===")
    print(stdout.read().decode('utf-8'))

pg(
    "SELECT id_firebird, numero_pedido, data_venda, valor_total, valor_desconto, status, depto_id, tenant_id FROM dash_vendas ORDER BY sincronizado_em DESC, data_venda DESC LIMIT 10;",
    "Ultimos 10 registros na dash_vendas"
)

client.close()

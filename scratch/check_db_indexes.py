import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('2.24.82.19', username='root', password='Col@13894645', timeout=10)

sql = """
SELECT
    t.relname as table_name,
    i.relname as index_name,
    pg_get_indexdef(i.oid) as index_def
FROM pg_class t
JOIN pg_index ix ON t.oid = ix.indrelid
JOIN pg_class i ON i.oid = ix.indexrelid
WHERE t.relname IN ('dash_vendas', 'dash_vendas_itens')
ORDER BY t.relname, i.relname;
"""

cmd = "docker exec -i vasjsucz4yxcb7m4rtqindd2 psql -U coliseu_admin -d coliseu_dashboard"
stdin, stdout, stderr = client.exec_command(cmd)
stdin.write(sql)
stdin.close()

print(stdout.read().decode('utf-8'))
client.close()

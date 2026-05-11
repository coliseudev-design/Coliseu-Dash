import paramiko
client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('177.39.17.7', username='root', password='6EFBC!c0:wzr%Ij')

script = "docker exec coliseu-db-thyqkc5gkvp7i1nld555wakz-131845936540 psql -U coliseu_admin -d coliseu_dashboard -c \"SELECT v.id_firebird, v.data_venda, v.valor_total, (SELECT SUM(vi.valor_total) FROM dash_vendas_itens vi WHERE vi.venda_id_firebird = v.id_firebird) as soma_itens, c.nome FROM dash_vendas v LEFT JOIN dash_clientes c ON c.id_firebird = v.cliente_id_firebird WHERE v.data_venda >= '2026-05-01' AND v.data_venda <= '2026-05-31' ORDER BY v.data_venda;\""
stdin, stdout, stderr = client.exec_command(script)
print(stdout.read().decode('utf-8'))

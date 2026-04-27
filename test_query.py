import paramiko
client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('177.39.17.7', username='root', password='6EFBC!c0:wzr%Ij')

script_id = "docker ps -q -f name=dashboard-middleware | head -n 1"
stdin, stdout, stderr = client.exec_command(script_id)
cid = stdout.read().decode('utf-8').strip()

script = f'''
docker exec --user root {cid} sed -i 's/SELECT categoria, SUM(valor_total) AS total/SELECT vi.categoria as categoria, SUM(vi.valor_total) AS total/g' src/routes/estatisticas.js
docker restart {cid}
'''
stdin, stdout, stderr = client.exec_command(script)
print('STDOUT:', stdout.read().decode('utf-8'))
print('STDERR:', stderr.read().decode('utf-8'))

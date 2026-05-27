import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('177.39.17.7', username='root', password='6EFBC!c0:wzr%Ij')

# Query sync metadata
script = """docker exec $(docker ps -q --filter name=db | head -1) psql -U coliseu_admin -d coliseu_dashboard -c "SELECT * FROM dash_sync_metadata ORDER BY ultima_sincronizacao DESC;" """
stdin, stdout, stderr = client.exec_command(script)
print("=== dash_sync_metadata ===")
print(stdout.read().decode('utf-8'))
err = stderr.read().decode('utf-8')
if err: print("ERR:", err)

client.close()

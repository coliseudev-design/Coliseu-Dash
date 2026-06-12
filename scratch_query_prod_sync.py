import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('2.24.82.19', username='root', password='Col@13894645', timeout=10)

db_container = 'vasjsucz4yxcb7m4rtqindd2'

# Query dash_sync_metadata for this tenant
query = "SELECT tabela, ultima_sincronizacao, registros_sincronizados, status, erro_mensagem FROM dash_sync_metadata WHERE tenant_id = 'ce3067f6-04a3-4b6c-a1b8-6aa47f24aad6';"
cmd = f'docker exec {db_container} psql -U coliseu_admin -d coliseu_dashboard -c "{query}"'

stdin, stdout, stderr = client.exec_command(cmd)
print("=== Sync Metadata ===")
print(stdout.read().decode('utf-8'))

client.close()

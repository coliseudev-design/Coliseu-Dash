import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('2.24.82.19', username='root', password='Col@13894645', timeout=10)

def run_cmd(cmd):
    stdin, stdout, stderr = client.exec_command(cmd)
    out = stdout.read().decode('utf-8')
    err = stderr.read().decode('utf-8')
    print(f"=== {cmd} ===")
    if out:
        print(out)
    if err:
        print("ERR:", err)

# Check sync metadata for the Coliseu tenant
query = """
SELECT tabela, ultima_sincronizacao, status, registros_sincronizados, erro_mensagem
FROM dash_sync_metadata
WHERE tenant_id = 'ce3067f6-04a3-4b6c-a1b8-6aa47f24aad6'
ORDER BY tabela;
"""
run_cmd(f"docker exec vasjsucz4yxcb7m4rtqindd2 psql -U coliseu_admin -d coliseu_dashboard -c \"{query}\"")

client.close()

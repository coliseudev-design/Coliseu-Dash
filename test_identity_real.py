import paramiko
import json
import urllib.request

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('177.39.17.7', username='root', password='6EFBC!c0:wzr%Ij')

# get tenant id
stdin, stdout, stderr = client.exec_command('docker exec coliseu-db psql -U coliseu_admin -d coliseu_dashboard -t -c "SELECT DISTINCT tenant_id FROM dash_usuarios LIMIT 1;"')
tenant_id = stdout.read().decode('utf-8').strip()

if tenant_id:
    print("Tenant ID:", tenant_id)
    url = f'https://adminlicencas.coliseusistemas.com.br/internal/companies/{tenant_id}/branches'
    key = 'Coliseu2026!IdentitySuperSecretKeyOauth20'
    req = urllib.request.Request(url, headers={'x-internal-api-key': key})
    try:
        with urllib.request.urlopen(req) as response:
            print("Status:", response.status)
            print("Response:", response.read().decode('utf-8'))
    except Exception as e:
        print("Error:", e)
else:
    print("No tenant ID found")

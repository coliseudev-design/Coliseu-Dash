import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('177.39.17.7', username='root', password='6EFBC!c0:wzr%Ij')

# Query dash_filiais
script = """docker exec $(docker ps -q --filter name=db | head -1) psql -U coliseu_admin -d coliseu_dashboard -c "SELECT * FROM dash_filiais;" """
stdin, stdout, stderr = client.exec_command(script)
print("=== dash_filiais ===")
print(stdout.read().decode('utf-8'))

client.close()

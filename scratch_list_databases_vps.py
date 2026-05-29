import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('177.39.17.7', username='root', password='6EFBC!c0:wzr%Ij')

DB_CONTAINER = "coliseu-db-thyqkc5gkvp7i1nld555wakz-172547374937"

stdin, stdout, stderr = client.exec_command(f"docker exec {DB_CONTAINER} psql -U coliseu_admin -d postgres -c 'SELECT datname FROM pg_database WHERE datistemplate = false;'")
print("DATABASES:")
print(stdout.read().decode('utf-8'))
client.close()

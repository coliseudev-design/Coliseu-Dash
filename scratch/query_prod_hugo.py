import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('177.39.17.7', username='root', password='6EFBC!c0:wzr%Ij')

# Query servers in coolify database
sql = "SELECT id, name, ip, \"user\", port, private_key_id FROM servers;"
cmd = f"docker exec coolify-db psql -U coolify -d coolify -c \"{sql}\" 2>&1"

print("=== Servers in Coolify ===")
stdin, stdout, stderr = client.exec_command(cmd)
print(stdout.read().decode('utf-8'))

client.close()

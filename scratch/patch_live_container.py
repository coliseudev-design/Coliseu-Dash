import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('177.39.17.7', username='root', password='6EFBC!c0:wzr%Ij')

env_path = "/artifacts/y148jidnkwaz0dxszb8tz979/.env"

print("=== READING COOLIFY .ENV FILE ON VPS ===")
stdin, stdout, stderr = client.exec_command(f"cat {env_path}")
env_content = stdout.read().decode('utf-8')
print("Lines in .env:")
for line in env_content.splitlines():
    if "IDENTITY" in line or "INTERNAL" in line:
        print("  ", line)

print("\n=== UPDATING .ENV FILE AND RESTARTING MIDDLEWARE CONTAINER ===")
# Sed replace or python replace in .env
update_cmd = f"sed -i 's/IDENTITY_INTERNAL_KEY=.*/IDENTITY_INTERNAL_KEY=Coliseu2026!IdentitySuperSecretKeyOauth20/g' {env_path}"
stdin, stdout, stderr = client.exec_command(update_cmd)
print("Sed status:", stdout.read().decode('utf-8'), stderr.read().decode('utf-8'))

# Restart container
container = "dashboard-middleware-irerzifjwjb4q8ucbpfk2gb8-213853066504"
stdin, stdout, stderr = client.exec_command(f"docker restart {container}")
print("Docker restart status:", stdout.read().decode('utf-8'), stderr.read().decode('utf-8'))

client.close()

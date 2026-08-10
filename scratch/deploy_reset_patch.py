import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('177.39.17.7', username='root', password='6EFBC!c0:wzr%Ij')

container = "dashboard-middleware-irerzifjwjb4q8ucbpfk2gb8-180216249719"

sftp = client.open_sftp()

# Copy rbac.js
with open('middleware/src/utils/rbac.js', 'r') as f:
    sftp.file('/tmp/rbac_patch.js', 'w').write(f.read())

# Copy usuarios.js
with open('middleware/src/routes/usuarios.js', 'r') as f:
    sftp.file('/tmp/usuarios_patch.js', 'w').write(f.read())

# Copy env.js
with open('middleware/src/config/env.js', 'r') as f:
    sftp.file('/tmp/env_patch.js', 'w').write(f.read())

sftp.close()

print("=== DEPLOYING BACKEND PATCHES TO ACTIVE MIDDLEWARE CONTAINER ===")
cmd = f"""
docker cp /tmp/rbac_patch.js {container}:/usr/src/app/src/utils/rbac.js && \
docker cp /tmp/usuarios_patch.js {container}:/usr/src/app/src/routes/usuarios.js && \
docker cp /tmp/env_patch.js {container}:/usr/src/app/src/config/env.js && \
docker restart {container}
"""

stdin, stdout, stderr = client.exec_command(cmd)
print("STDOUT:", stdout.read().decode('utf-8'))
print("STDERR:", stderr.read().decode('utf-8'))

client.close()

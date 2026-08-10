import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('177.39.17.7', username='root', password='6EFBC!c0:wzr%Ij')

container = "dashboard-middleware-irerzifjwjb4q8ucbpfk2gb8-191213937671"

sftp = client.open_sftp()

# Copy cache.js
with open('middleware/src/config/cache.js', 'r') as f:
    sftp.file('/tmp/cache_patch.js', 'w').write(f.read())

# Copy period.js
with open('middleware/src/utils/period.js', 'r') as f:
    sftp.file('/tmp/period_patch.js', 'w').write(f.read())

sftp.close()

print("=== DEPLOYING PERFORMANCE PATCHES TO ACTIVE MIDDLEWARE CONTAINER ===")
cmd = f"""
docker cp /tmp/cache_patch.js {container}:/usr/src/app/src/config/cache.js && \
docker cp /tmp/period_patch.js {container}:/usr/src/app/src/utils/period.js && \
docker restart {container}
"""

stdin, stdout, stderr = client.exec_command(cmd)
print("STDOUT:", stdout.read().decode('utf-8'))
print("STDERR:", stderr.read().decode('utf-8'))

client.close()

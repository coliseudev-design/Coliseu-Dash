import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('177.39.17.7', username='root', password='6EFBC!c0:wzr%Ij')

container = "dashboard-middleware-irerzifjwjb4q8ucbpfk2gb8-213853066504"

# Read local middleware/src/config/env.js
with open('middleware/src/config/env.js', 'r') as f:
    local_env_js = f.read()

sftp = client.open_sftp()
with sftp.file('/tmp/env_patch.js', 'w') as remote_file:
    remote_file.write(local_env_js)
sftp.close()

print("=== COPYING PATCHED env.js INTO LIVE MIDDLEWARE CONTAINER ===")
cmd = f"docker cp /tmp/env_patch.js {container}:/app/src/config/env.js && docker restart {container}"
stdin, stdout, stderr = client.exec_command(cmd)
print("STDOUT:", stdout.read().decode('utf-8'))
print("STDERR:", stderr.read().decode('utf-8'))

client.close()

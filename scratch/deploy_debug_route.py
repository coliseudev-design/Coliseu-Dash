import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('177.39.17.7', username='root', password='6EFBC!c0:wzr%Ij')

# Find active middleware container
stdin, stdout, stderr = client.exec_command("docker ps --format '{{.Names}}' | grep dashboard-middleware")
MW = stdout.read().decode('utf-8').strip()
print("Found active middleware container:", MW)

# Read the local debug.js
with open("middleware/src/routes/debug.js", "r", encoding="utf-8") as f:
    debug_js_content = f.read()

# Write debug.js to /tmp/debug.js on VPS
sftp = client.open_sftp()
with sftp.open("/tmp/debug.js", "w") as f:
    f.write(debug_js_content)
sftp.close()

# Copy it into the container and restart
print("Copying debug.js inside the container...")
stdin, stdout, stderr = client.exec_command(f"docker cp /tmp/debug.js {MW}:/usr/src/app/src/routes/debug.js")
print(stdout.read().decode('utf-8'))
print(stderr.read().decode('utf-8'))

print("Restarting container...")
stdin, stdout, stderr = client.exec_command(f"docker restart {MW}")
print(stdout.read().decode('utf-8'))
print(stderr.read().decode('utf-8'))

client.close()
print("Done!")
